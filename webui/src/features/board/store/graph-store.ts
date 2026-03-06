import {
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from "@xyflow/react"
import { create } from "zustand/react"

import type { LinkEdge, NoteNode } from "../types/flow"
import type { Link } from "../types/link"
import type { Note } from "../types/note"

import { convertEdgeToLinkWithPoints, convertNodeToNote } from "../utils/graph"
import { computeAttachment, findAttachTarget, nodeCenter } from "../utils/point-attach"
import {
  applyEdgePatches,
  applyNodePatches,
  diffEdges,
  diffEdgesById,
  diffNodes,
  diffNodesById,
  hasPatchContent,
  sanitizeEdges,
  sanitizeNodes,
  type EdgePatch,
  type NodePatch,
  type Patch,
} from "../utils/history"
import { POINT_NODE_SIZE } from "../components/flow/point-node"
import { DEBOUNCE_DELAY } from "../const"

import { addLinks } from "../api/add-links"
import { addNotes } from "../api/add-notes"
import { updateLink } from "../api/update-link"
import { updateNote } from "../api/update-note"
import { removeLink } from "../api/remove-link"
import { removeNote } from "../api/remove-note"
import {
  loadViewportsFromStorage,
  saveViewportToStorage,
} from "./viewport-store"
import { clearRoughCanvasCache } from "@/components/rough/cache"
import { generateUuid } from "@/lib/common"
import {
  clearBoardBackground,
  clearBoardBackgroundTexture,
  getBoardBackground,
  getBoardBackgroundTexture,
  setBoardBackground as persistBoardBackground,
  setBoardBackgroundTexture as persistBoardBackgroundTexture,
  type BoardBackgroundTexture,
} from "../utils/board-background"

// --- helpers ---

type Updater<T> = T | ((prev: T) => T)
type GraphScope = {
  boardId?: string
  rootId?: string
}

const resolveUpdater = <T>(updater: Updater<T>, prev: T): T =>
  typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater

const isPointNode = (node: NoteNode | undefined) =>
  Boolean(node && (node.data as { kind?: string }).kind === "point")

const isFolderNode = (node: NoteNode | undefined) =>
  Boolean(node && node.data?.style?.type === "folder")

const buildNodesById = (nodes: NoteNode[]) =>
  new Map(nodes.map((n) => [n.id, n]))

const buildAttachedPointIdsByNode = (nodes: NoteNode[]) => {
  const map = new Map<string, Set<string>>()
  for (const node of nodes) {
    if (!isPointNode(node)) continue
    const attachedTo = (node.data as { attachedToNodeId?: string }).attachedToNodeId
    if (!attachedTo) continue
    let set = map.get(attachedTo)
    if (!set) {
      set = new Set()
      map.set(attachedTo, set)
    }
    set.add(node.id)
  }
  return map
}

const cloneAttachedPointIdsByNode = (source: Map<string, Set<string>>) =>
  new Map(Array.from(source.entries()).map(([id, set]) => [id, new Set(set)]))

const getScopeKey = ({ boardId, rootId }: GraphScope) =>
  boardId ? `${boardId}:${rootId ?? "root"}` : undefined

// Incrementally update node index for small change sets to avoid full rebuilds.
const updateNodesById = (
  prev: Map<string, NoteNode>,
  nextNodes: NoteNode[],
  changes: NodeChange<NoteNode>[],
) => {
  const next = new Map(prev)

  for (const ch of changes) {
    if (ch.type === "add") {
      next.set(ch.item.id, ch.item)
      continue
    }
    if (ch.type === "remove") {
      if (ch.id) next.delete(ch.id)
      continue
    }
    // For other change types, swap in the latest node instance.
    if (ch.id) {
      const updated = nextNodes.find((n) => n.id === ch.id)
      if (updated) next.set(ch.id, updated)
    }
  }

  return next
}

function shouldPersistNodeChange(
  ch: NodeChange<NoteNode>,
  isResizing: boolean,
): boolean {
  switch (ch.type) {
    case "select":
      return false
    case "remove":
      return false
    case "position":
      return ch.dragging === false
    case "dimensions":
      if (typeof ch.resizing === "boolean") {
        return ch.resizing === false
      }
      return !isResizing
    default:
      return true
  }
}

function shouldPersistEdgeChange(ch: EdgeChange<LinkEdge>): boolean {
  switch (ch.type) {
    case "select":
    case "remove":
      return false
    default:
      return true
  }
}

const HISTORY_COALESCE_DELAY = 350

const samePatchValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const mergeNodePatches = (base: NodePatch[] = [], incoming: NodePatch[] = []): NodePatch[] => {
  const merged = new Map<string, NodePatch>()
  for (const patch of base) {
    merged.set(patch.id, patch)
  }
  for (const patch of incoming) {
    const previous = merged.get(patch.id)
    if (!previous) {
      merged.set(patch.id, patch)
      continue
    }
    merged.set(patch.id, {
      id: patch.id,
      before: previous.before,
      after: patch.after,
    })
  }
  return Array.from(merged.values()).filter((patch) => !samePatchValue(patch.before, patch.after))
}

const mergeEdgePatches = (base: EdgePatch[] = [], incoming: EdgePatch[] = []): EdgePatch[] => {
  const merged = new Map<string, EdgePatch>()
  for (const patch of base) {
    merged.set(patch.id, patch)
  }
  for (const patch of incoming) {
    const previous = merged.get(patch.id)
    if (!previous) {
      merged.set(patch.id, patch)
      continue
    }
    merged.set(patch.id, {
      id: patch.id,
      before: previous.before,
      after: patch.after,
    })
  }
  return Array.from(merged.values()).filter((patch) => !samePatchValue(patch.before, patch.after))
}

const collectPatchIds = (patches: { id: string }[] | undefined): Set<string> =>
  new Set((patches ?? []).map((patch) => patch.id))

const setsOverlap = (a: Set<string>, b: Set<string>): boolean => {
  for (const value of a) {
    if (b.has(value)) return true
  }
  return false
}

const canCoalescePatches = (pending: Patch, incoming: Patch): boolean => {
  if (pending.source !== "ui" || incoming.source !== "ui") return false
  const pendingNodeIds = collectPatchIds(pending.nodes)
  const incomingNodeIds = collectPatchIds(incoming.nodes)
  if (pendingNodeIds.size > 0 && incomingNodeIds.size > 0 && setsOverlap(pendingNodeIds, incomingNodeIds)) {
    return true
  }
  const pendingEdgeIds = collectPatchIds(pending.edges)
  const incomingEdgeIds = collectPatchIds(incoming.edges)
  return pendingEdgeIds.size > 0 && incomingEdgeIds.size > 0 && setsOverlap(pendingEdgeIds, incomingEdgeIds)
}

const mergePatches = (pending: Patch, incoming: Patch): Patch => ({
  ...pending,
  id: incoming.id,
  ts: incoming.ts,
  nodes: mergeNodePatches(pending.nodes, incoming.nodes),
  edges: mergeEdgePatches(pending.edges, incoming.edges),
})

// --- debounced persistence state (module-level singletons) ---

// Nodes: separate queues for new vs updated, share one timer
const pendingNewNodes = new Map<string, NoteNode>()
const pendingUpdatedNodes = new Map<string, NoteNode>()
let nodePersistTimeout: ReturnType<typeof setTimeout> | null = null

// Edges: same idea
const pendingNewEdges = new Map<string, LinkEdge>()
const pendingUpdatedEdges = new Map<string, LinkEdge>()
let edgePersistTimeout: ReturnType<typeof setTimeout> | null = null
let historyCoalesceTimeout: ReturnType<typeof setTimeout> | null = null
let pendingHistoryPatch: Patch | null = null

const clearPendingPersistenceQueues = () => {
  pendingNewNodes.clear()
  pendingUpdatedNodes.clear()
  pendingNewEdges.clear()
  pendingUpdatedEdges.clear()

  if (nodePersistTimeout !== null) {
    clearTimeout(nodePersistTimeout)
    nodePersistTimeout = null
  }
  if (edgePersistTimeout !== null) {
    clearTimeout(edgePersistTimeout)
    edgePersistTimeout = null
  }
}

// --- debounced flushes (conversion happens here, not on hot path) ---

function scheduleNodeFlush() {
  if (nodePersistTimeout !== null) {
    clearTimeout(nodePersistTimeout)
  }

  nodePersistTimeout = setTimeout(async () => {
    nodePersistTimeout = null

    const newNodes = Array.from(pendingNewNodes.values())
    const updatedNodes = Array.from(pendingUpdatedNodes.values())

    pendingNewNodes.clear()
    pendingUpdatedNodes.clear()

    try {
      const newByBoard = new Map<string, NoteNode[]>()
      for (const node of newNodes) {
        const graphUid = node.data?.graphUid
        if (!graphUid) continue
        const list = newByBoard.get(graphUid) ?? []
        list.push(node)
        newByBoard.set(graphUid, list)
      }

      const updatedByBoard = new Map<string, NoteNode[]>()
      for (const node of updatedNodes) {
        const graphUid = node.data?.graphUid
        if (!graphUid) continue
        const list = updatedByBoard.get(graphUid) ?? []
        list.push(node)
        updatedByBoard.set(graphUid, list)
      }

      await Promise.all(
        Array.from(newByBoard.entries()).map(([graphUid, nodes]) =>
          addNotes(
            graphUid,
            nodes
              .map((n) => convertNodeToNote(n))
              .filter((n): n is Note => n !== null),
          ),
        ),
      )

      await Promise.all(
        Array.from(updatedByBoard.entries()).map(([graphUid, nodes]) =>
          Promise.all(
            (() => {
              const updates: Promise<void>[] = []
              for (const n of nodes) {
                const note = convertNodeToNote(n)
                if (!note) continue
                updates.push(updateNote(graphUid, n.id, note as Partial<Note>))
              }
              return updates
            })(),
          ),
        ),
      )
    } catch (err) {
      console.error("Failed to persist nodes", err)
    }
  }, DEBOUNCE_DELAY)
}

function queueNodesForPersistence(
  get: () => { boardId?: string; rootId?: string; nodes: NoteNode[] },
  addedIds: Set<string>,
  updatedIds: Set<string>,
) {
  const { boardId, nodes } = get()
  if (!boardId) return
  if (addedIds.size === 0 && updatedIds.size === 0) return

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const immediateFolderSaves: Promise<unknown>[] = []

  for (const id of addedIds) {
    const node = byId.get(id)
    if (!node || isPointNode(node)) continue
    if (isFolderNode(node)) {
      const note = convertNodeToNote(node)
      if (note) {
        immediateFolderSaves.push(addNotes(boardId, [note]))
      }
      continue
    }
    pendingNewNodes.set(id, node)
    pendingUpdatedNodes.delete(id)
  }

  for (const id of updatedIds) {
    if (pendingNewNodes.has(id)) continue
    const node = byId.get(id)
    if (!node || isPointNode(node)) continue
    pendingUpdatedNodes.set(id, node)
  }

  if (immediateFolderSaves.length > 0) {
    void Promise.all(immediateFolderSaves).catch((err) => {
      console.error("Failed to persist folder nodes", err)
    })
  }

  scheduleNodeFlush()
}

function scheduleEdgeFlush(
  get: () => { boardId?: string; rootId?: string; edges: LinkEdge[]; nodes: NoteNode[] },
) {
  if (edgePersistTimeout !== null) {
    clearTimeout(edgePersistTimeout)
  }

  edgePersistTimeout = setTimeout(async () => {
    edgePersistTimeout = null

    const newEdges = Array.from(pendingNewEdges.values())
    const updatedEdges = Array.from(pendingUpdatedEdges.values())
    const nodesById = new Map(get().nodes.map((n) => [n.id, n]))

    pendingNewEdges.clear()
    pendingUpdatedEdges.clear()

    try {
      const newByBoard = new Map<string, LinkEdge[]>()
      for (const edge of newEdges) {
        const graphUid = (edge.data as Link | undefined)?.graphUid
        if (!graphUid) continue
        const list = newByBoard.get(graphUid) ?? []
        list.push(edge)
        newByBoard.set(graphUid, list)
      }

      const updatedByBoard = new Map<string, LinkEdge[]>()
      for (const edge of updatedEdges) {
        const graphUid = (edge.data as Link | undefined)?.graphUid
        if (!graphUid) continue
        const list = updatedByBoard.get(graphUid) ?? []
        list.push(edge)
        updatedByBoard.set(graphUid, list)
      }

      await Promise.all(
        Array.from(newByBoard.entries()).map(([graphUid, edges]) =>
          addLinks(
            graphUid,
            edges.map((e) => convertEdgeToLinkWithPoints(e, nodesById)),
          ),
        ),
      )

      await Promise.all(
        Array.from(updatedByBoard.entries()).map(([graphUid, edges]) =>
          Promise.all(
            edges.map((e) =>
              updateLink(
                graphUid,
                e.id,
                convertEdgeToLinkWithPoints(e, nodesById) as Partial<Link>,
              ),
            ),
          ),
        ),
      )
    } catch (err) {
      console.error("Failed to persist edges", err)
    }
  }, DEBOUNCE_DELAY)
}

function queueEdgesForPersistence(
  get: () => { boardId?: string; rootId?: string; edges: LinkEdge[]; nodes: NoteNode[] },
  addedIds: Set<string>,
  updatedIds: Set<string>,
) {
  const { boardId, edges } = get()
  if (!boardId) return
  if (addedIds.size === 0 && updatedIds.size === 0) return

  const byId = new Map(edges.map((e) => [e.id, e]))

  for (const id of addedIds) {
    const edge = byId.get(id)
    if (!edge) continue
    pendingNewEdges.set(id, edge)
    pendingUpdatedEdges.delete(id)
  }

  for (const id of updatedIds) {
    if (pendingNewEdges.has(id)) continue
    const edge = byId.get(id)
    if (!edge) continue
    pendingUpdatedEdges.set(id, edge)
  }

  scheduleEdgeFlush(get)
}

// --- background helpers (diff + persist) ---

function scheduleNodePersistFromDiff(
  prevNodes: NoteNode[],
  nextNodes: NoteNode[],
  scopeKeyAtTime: string | undefined,
  get: () => { boardId?: string; rootId?: string; nodes: NoteNode[] },
) {
  if (!scopeKeyAtTime) return

  setTimeout(() => {
    const { boardId, rootId, nodes } = get()
    if (!boardId || getScopeKey({ boardId, rootId }) !== scopeKeyAtTime) return

    const prevIds = new Set(prevNodes.map((n) => n.id))
    const nextIds = new Set(nextNodes.map((n) => n.id))
    const prevById = new Map(prevNodes.map((n) => [n.id, n]))

    const addedIds = new Set<string>()
    const removedIds = new Set<string>()
    const updatedIds = new Set<string>()

    for (const node of nextNodes) {
      const id = node.id
      if (!prevIds.has(id)) {
        addedIds.add(id)
        continue
      }
      const prev = prevById.get(id)
      if (!prev) continue
      if (prev !== node) {
        updatedIds.add(id)
      }
    }

    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        removedIds.add(id)
      }
    }

    // filter out point nodes from persistence
    const nextById = new Map(nextNodes.map((n) => [n.id, n]))

    const dropPointIds = (ids: Set<string>, lookup: Map<string, NoteNode>) => {
      for (const id of Array.from(ids)) {
        const node = lookup.get(id)
        if (isPointNode(node)) {
          ids.delete(id)
        }
      }
    }

    dropPointIds(addedIds, nextById)
    dropPointIds(updatedIds, nextById)
    dropPointIds(removedIds, prevById)

    if (removedIds.size > 0) {
      removedIds.forEach((id) => {
        pendingNewNodes.delete(id)
        pendingUpdatedNodes.delete(id)
        void removeNote(boardId, id)
      })
    }

    if (addedIds.size > 0 || updatedIds.size > 0) {
      queueNodesForPersistence(
        () => ({
          boardId: get().boardId,
          rootId: get().rootId,
          nodes,
        }),
        addedIds,
        updatedIds,
      )
    }
  }, 0)
}

function scheduleEdgePersistFromDiff(
  prevEdges: LinkEdge[],
  nextEdges: LinkEdge[],
  scopeKeyAtTime: string | undefined,
  get: () => { boardId?: string; rootId?: string; edges: LinkEdge[]; nodes: NoteNode[] },
) {
  if (!scopeKeyAtTime) return

  setTimeout(() => {
    const { boardId, rootId, edges } = get()
    if (!boardId || getScopeKey({ boardId, rootId }) !== scopeKeyAtTime) return

    const prevIds = new Set(prevEdges.map((e) => e.id))
    const nextIds = new Set(nextEdges.map((e) => e.id))
    const prevById = new Map(prevEdges.map((e) => [e.id, e]))

    const addedIds = new Set<string>()
    const removedIds = new Set<string>()
    const updatedIds = new Set<string>()

    for (const edge of nextEdges) {
      const id = edge.id
      if (!prevIds.has(id)) {
        addedIds.add(id)
        continue
      }
      const prev = prevById.get(id)
      if (!prev) continue
      if (prev !== edge) {
        updatedIds.add(id)
      }
    }

    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        removedIds.add(id)
      }
    }

    if (removedIds.size > 0) {
      removedIds.forEach((id) => {
        pendingNewEdges.delete(id)
        pendingUpdatedEdges.delete(id)
        void removeLink(boardId, id)
      })
    }

    if (addedIds.size > 0 || updatedIds.size > 0) {
      queueEdgesForPersistence(
        () => ({
          boardId: get().boardId,
          rootId: get().rootId,
          edges,
          nodes: get().nodes,
        }),
        addedIds,
        updatedIds,
      )
    }
  }, 0)
}

// background helper specifically for ReactFlow node changes
function scheduleNodePersistFromChanges(
  prevNodes: NoteNode[],
  nextNodes: NoteNode[],
  scopeKeyAtTime: string | undefined,
  changes: NodeChange<NoteNode>[],
  isResizingAtTime: boolean,
  get: () => { boardId?: string; rootId?: string; nodes: NoteNode[]; deletedNodes: NoteNode[] },
  set: (
    partial:
      | Partial<GraphStore>
      | ((state: GraphStore) => Partial<GraphStore>),
  ) => void,
) {
  if (!scopeKeyAtTime) return
  const onlyTransient = changes.every((ch) => {
    if (ch.type === "select") return true
    if (ch.type === "position" && ch.dragging) return true
    return false
  })
  if (onlyTransient) return

  setTimeout(() => {
    const state = get()
    const boardId = state.boardId
    if (!boardId || getScopeKey({ boardId, rootId: state.rootId }) !== scopeKeyAtTime) return

    const { nodes } = state

    const prevIds = new Set(prevNodes.map((n) => n.id))
    const nextById = new Map(nextNodes.map((n) => [n.id, n]))

    const explicitRemovedIds = new Set<string>(
      changes
        .filter((ch) => ch.type === "remove")
        .map((ch) => ch.id)
        .filter((id): id is string => !!id),
    )

    const diffRemovedIds = new Set<string>()
    for (const id of prevIds) {
      if (!nextById.has(id)) diffRemovedIds.add(id)
    }

    const removedIds = new Set<string>([
      ...explicitRemovedIds,
      ...diffRemovedIds,
    ])

    if (removedIds.size > 0) {
      const deletedNow = prevNodes
        .filter((n) => removedIds.has(n.id))
        .map((n) => ({
          ...n,
          data: { ...n.data, deletedAt: new Date().toISOString() },
        }))

      set((s) => ({
        deletedNodes: [...s.deletedNodes, ...deletedNow],
      }))

      removedIds.forEach((id) => {
        pendingNewNodes.delete(id)
        pendingUpdatedNodes.delete(id)
        void removeNote(boardId, id)
      })
    }

    const addedIds = new Set<string>(
      changes
        .filter((ch) => ch.type === "add")
        .map((ch) => ch.item.id),
    )

    const candidateUpdateIds = new Set<string>()
    for (const ch of changes) {
      const id = ch.type === "add" ? ch.item.id : ch.id
      if (!id) continue
      if (removedIds.has(id)) continue
      if (shouldPersistNodeChange(ch, isResizingAtTime)) {
        candidateUpdateIds.add(id)
      }
    }

    const updatedIds = new Set<string>()
    for (const id of candidateUpdateIds) {
      if (!addedIds.has(id)) {
        updatedIds.add(id)
      }
    }

    if (addedIds.size > 0 || updatedIds.size > 0) {
      queueNodesForPersistence(
        () => ({
          boardId: get().boardId,
          rootId: get().rootId,
          nodes,
        }),
        addedIds,
        updatedIds,
      )
    }
  }, 0)
}

function scheduleEdgePersistFromChanges(
  prevEdges: LinkEdge[],
  nextEdges: LinkEdge[],
  scopeKeyAtTime: string | undefined,
  changes: EdgeChange<LinkEdge>[],
  get: () => {
    boardId?: string
    rootId?: string
    edges: LinkEdge[]
    nodes: NoteNode[]
    deletedEdges: LinkEdge[]
  },
  set: (
    partial:
      | Partial<GraphStore>
      | ((state: GraphStore) => Partial<GraphStore>),
  ) => void,
) {
  if (!scopeKeyAtTime) return
  if (changes.every((ch) => ch.type === "select")) return

  setTimeout(() => {
    const state = get()
    const boardId = state.boardId
    if (!boardId || getScopeKey({ boardId, rootId: state.rootId }) !== scopeKeyAtTime) return

    const { edges } = state

    const prevIds = new Set(prevEdges.map((e) => e.id))
    const nextById = new Map(nextEdges.map((e) => [e.id, e]))

    const explicitRemovedIds = new Set<string>(
      changes
        .filter((ch) => ch.type === "remove")
        .map((ch) => ch.id)
        .filter((id): id is string => !!id),
    )

    const diffRemovedIds = new Set<string>()
    for (const id of prevIds) {
      if (!nextById.has(id)) diffRemovedIds.add(id)
    }

    const removedIds = new Set<string>([
      ...explicitRemovedIds,
      ...diffRemovedIds,
    ])

    if (removedIds.size > 0) {
      const deletedNow = prevEdges
        .filter((e) => removedIds.has(e.id))
        .map((e) => ({
          ...e,
          data: {
            ...(e.data as Link),
            deletedAt: new Date().toISOString(),
          },
        }))

      set((s) => ({
        deletedEdges: [...s.deletedEdges, ...deletedNow],
      }))

      removedIds.forEach((id) => {
        pendingNewEdges.delete(id)
        pendingUpdatedEdges.delete(id)
        void removeLink(boardId, id)
      })
    }

    const addedIds = new Set<string>(
      changes
        .filter((ch) => ch.type === "add")
        .map((ch) => ch.item.id),
    )

    const candidateUpdateIds = new Set<string>()
    for (const ch of changes) {
      const id = ch.type === "add" ? ch.item.id : ch.id
      if (!id) continue
      if (removedIds.has(id)) continue
      if (shouldPersistEdgeChange(ch)) {
        candidateUpdateIds.add(id)
      }
    }

    const updatedIds = new Set<string>()
    for (const id of candidateUpdateIds) {
      if (!addedIds.has(id)) {
        updatedIds.add(id)
      }
    }

    if (addedIds.size > 0 || updatedIds.size > 0) {
      queueEdgesForPersistence(
        () => ({
          boardId: get().boardId,
          rootId: get().rootId,
          edges,
          nodes: get().nodes,
        }),
        addedIds,
        updatedIds,
      )
    }
  }, 0)
}

// --- store ---

export interface GraphStore {
  boardId?: string
  rootId?: string
  currentFolderDepth: number
  maxFolderDepth: number
  setCurrentFolderDepth: (depth: number) => void
  setFolderDepthFromPathLength: (pathLength: number) => void
  setGraphScope: (scope: { boardId?: string; rootId?: string }) => void

  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  nodes: NoteNode[]
  nodesById: Map<string, NoteNode>
  attachedPointIdsByNode: Map<string, Set<string>>
  edges: LinkEdge[]

  deletedNodes: NoteNode[]
  deletedEdges: LinkEdge[]

  isResizingNode: boolean
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
  isDraggingNodes: boolean
  draggingNodeIds: Set<string>
  draggingPointId?: string
  lastCursorPosition?: { x: number; y: number }
  setLastCursorPosition: (position?: { x: number; y: number }) => void
  viewSlides: boolean
  setViewSlides: (enabled: boolean) => void
  presentationMode: boolean
  setPresentationMode: (enabled: boolean) => void
  activeSlideId?: string
  setActiveSlideId: (id?: string) => void
  isSelectMode: boolean
  setIsSelectMode: (enabled: boolean) => void
  isMoving: boolean
  setIsMoving: (moving: boolean) => void
  zoom: number
  setZoom: (zoom: number) => void
  boardBackground: string | null
  setBoardBackground: (color: string | null) => void
  boardBackgroundTexture: BoardBackgroundTexture | null
  setBoardBackgroundTexture: (texture: BoardBackgroundTexture | null) => void
  boardVisibility: "private" | "public"
  setBoardVisibility: (visibility: "private" | "public") => void
  boardCanEdit: boolean
  setBoardCanEdit: (canEdit: boolean) => void

  setNodes: (nodes: Updater<NoteNode[]>) => void
  setEdges: (edges: Updater<LinkEdge[]>) => void

  setNodesPersist: (nodes: Updater<NoteNode[]>) => void
  /**
   * Persist-scoped single node mutation.
   * Mirrors setNodesPersist semantics (history + debounced persistence),
   * but updates only one node by id.
   */
  updateNodeByIdPersist: (id: string, updater: (node: NoteNode) => NoteNode) => void
  setEdgesPersist: (edges: Updater<LinkEdge[]>) => void
  /**
   * Persist-scoped single edge mutation.
   * Mirrors setEdgesPersist semantics (history + debounced persistence),
   * but updates only one edge by id.
   */
  updateEdgeByIdPersist: (id: string, updater: (edge: LinkEdge) => LinkEdge) => void

  onNodesChange: (changes: NodeChange<NoteNode>[]) => void
  onEdgesChange: (changes: EdgeChange<LinkEdge>[]) => void
  onNodesDelete: (nodes: NoteNode[]) => void
  onEdgesDelete: (edges: LinkEdge[]) => void

  setDeletedNodes: (nodes: NoteNode[]) => void
  setDeletedEdges: (edges: LinkEdge[]) => void
  setIsResizingNode: (resizing: boolean) => void

  graphViewports: Record<string, Viewport>
  setGraphViewport: (boardId: string, viewport: Viewport) => void

  historyPast: Patch[]
  historyFuture: Patch[]
  historyLimit: number
  historyRecording: boolean
  dragSnapshotNodes: NoteNode[] | null
  resizeSnapshotNodes: NoteNode[] | null
  enqueuePatch: (patch: Patch, options?: { coalesce?: boolean }) => void
  flushPendingPatch: () => void
  pushPatch: (patch: Patch) => void
  undo: () => void
  redo: () => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  boardId: undefined,
  rootId: undefined,
  currentFolderDepth: -1,
  maxFolderDepth: 4,
  setCurrentFolderDepth: (depth) => {
    const next = Number.isFinite(depth) ? Math.floor(depth) : -1
    set({ currentFolderDepth: next })
  },
  setFolderDepthFromPathLength: (pathLength) => set({
    currentFolderDepth: Math.max(0, Math.floor(pathLength) - 1),
  }),

  setGraphScope: ({ boardId, rootId }) => {
    get().flushPendingPatch()
    clearPendingPersistenceQueues()
    set((state) => {
      const changed = state.boardId !== boardId || state.rootId !== rootId
      if (changed) {
        clearRoughCanvasCache()
      }
      return changed
        ? {
            boardId,
            rootId,
            currentFolderDepth: rootId ? -1 : 0,
            historyPast: [],
            historyFuture: [],
            dragSnapshotNodes: null,
            resizeSnapshotNodes: null,
            presentationMode: false,
            activeSlideId: undefined,
            lastCursorPosition: undefined,
            boardBackground: getBoardBackground(boardId),
            boardBackgroundTexture: getBoardBackgroundTexture(boardId),
            boardVisibility: "private",
            boardCanEdit: true,
          }
        : {
            boardId,
            rootId,
            currentFolderDepth: rootId ? -1 : 0,
            boardBackground: getBoardBackground(boardId),
            boardBackgroundTexture: getBoardBackgroundTexture(boardId),
          }
    })
  },

  isLoading: false,

  setIsLoading: (loading) => set({ isLoading: loading }),

  nodes: [],
  nodesById: new Map(),
  attachedPointIdsByNode: new Map(),
  edges: [],

  deletedNodes: [],
  deletedEdges: [],

  isResizingNode: false,
  isDragging: false,
  isDraggingNodes: false,
  draggingNodeIds: new Set(),
  draggingPointId: undefined,
  lastCursorPosition: undefined,
  setLastCursorPosition: (position) => set({ lastCursorPosition: position }),
  viewSlides: true,
  setViewSlides: (enabled) => set({ viewSlides: enabled }),
  presentationMode: false,
  setPresentationMode: (enabled) => set({ presentationMode: enabled }),
  activeSlideId: undefined,
  setActiveSlideId: (id) => set({ activeSlideId: id }),
  isSelectMode: false,
  isMoving: false,
  zoom: 1,
  boardBackground: null,
  boardBackgroundTexture: null,
  boardVisibility: "private",
  boardCanEdit: true,
  setBoardBackground: (color) => {
    const boardId = get().boardId
    if (!boardId) return
    if (!color) {
      clearBoardBackground(boardId)
      set({ boardBackground: null })
      return
    }
    persistBoardBackground(boardId, color)
    set({ boardBackground: color })
  },
  setBoardBackgroundTexture: (texture) => {
    const boardId = get().boardId
    if (!boardId) return
    if (!texture) {
      clearBoardBackgroundTexture(boardId)
      set({ boardBackgroundTexture: null })
      return
    }
    persistBoardBackgroundTexture(boardId, texture)
    set({ boardBackgroundTexture: texture })
  },
  setBoardVisibility: (visibility) => set({ boardVisibility: visibility }),
  setBoardCanEdit: (canEdit) => set({ boardCanEdit: canEdit }),

  // --- flexible setters ---

  setNodes: (nodesOrUpdater) =>
    set((state) => {
      const nextNodes = resolveUpdater<NoteNode[]>(nodesOrUpdater, state.nodes)
      return {
        nodes: nextNodes,
        nodesById: buildNodesById(nextNodes),
        attachedPointIdsByNode: buildAttachedPointIdsByNode(nextNodes),
      }
    }),

  setEdges: (edgesOrUpdater) =>
    set((state) => ({
      edges: resolveUpdater<LinkEdge[]>(edgesOrUpdater, state.edges),
    })),

  // --- set + background diff + debounced persist ---

  setNodesPersist: (nodesOrUpdater) => {
    const recording = get().historyRecording
    const scopeKey = getScopeKey(get())
    const prevNodes = get().nodes

    const nextNodes =
      typeof nodesOrUpdater === "function"
        ? (nodesOrUpdater as (prev: NoteNode[]) => NoteNode[])(prevNodes)
        : nodesOrUpdater

    set({
      nodes: nextNodes,
      nodesById: buildNodesById(nextNodes),
      attachedPointIdsByNode: buildAttachedPointIdsByNode(nextNodes),
    })

    if (recording) {
      const patches = diffNodes(sanitizeNodes(prevNodes), sanitizeNodes(nextNodes))
      if (patches.length > 0) {
        get().enqueuePatch({
          id: generateUuid(),
          ts: Date.now(),
          source: "ui",
          nodes: patches,
        })
      }
    }

    scheduleNodePersistFromDiff(prevNodes, nextNodes, scopeKey, () => ({
      boardId: get().boardId,
      rootId: get().rootId,
      nodes: get().nodes,
    }))
  },

  /**
   * Targeted node update path for hot UI interactions (typing/style toggles).
   * Keeps persistence behavior aligned with setNodesPersist while avoiding
   * repeated full-list scans in callsites.
   */
  updateNodeByIdPersist: (id, updater) => {
    const recording = get().historyRecording
    const prevNodes = get().nodes
    const prevNodesById = get().nodesById
    const prevNode = prevNodesById.get(id)
    if (!prevNode) return

    const nextNode = updater(prevNode)
    if (nextNode === prevNode) return

    // Keep array state for React Flow while replacing only the touched node.
    const nextNodes = prevNodes.map((node) => (node.id === id ? nextNode : node))
    const nextNodesById = new Map(prevNodesById)
    nextNodesById.set(id, nextNode)

    let nextAttached = get().attachedPointIdsByNode
    const prevAttachedTo = isPointNode(prevNode)
      ? (prevNode.data as { attachedToNodeId?: string }).attachedToNodeId
      : undefined
    const nextAttachedTo = isPointNode(nextNode)
      ? (nextNode.data as { attachedToNodeId?: string }).attachedToNodeId
      : undefined
    // Re-index point attachment only when attachment linkage changed.
    if (prevAttachedTo !== nextAttachedTo) {
      nextAttached = cloneAttachedPointIdsByNode(nextAttached)
      if (prevAttachedTo) {
        const prevSet = nextAttached.get(prevAttachedTo)
        if (prevSet) {
          prevSet.delete(id)
          if (prevSet.size === 0) nextAttached.delete(prevAttachedTo)
        }
      }
      if (nextAttachedTo) {
        let nextSet = nextAttached.get(nextAttachedTo)
        if (!nextSet) {
          nextSet = new Set<string>()
          nextAttached.set(nextAttachedTo, nextSet)
        }
        nextSet.add(id)
      }
    }

    set({
      nodes: nextNodes,
      nodesById: nextNodesById,
      attachedPointIdsByNode: nextAttached,
    })

    // Keep undo/redo parity with setNodesPersist by recording scoped node patches.
    if (recording) {
      const touchedIds = new Set([id])
      const patches = diffNodesById(sanitizeNodes(prevNodes), sanitizeNodes(nextNodes), touchedIds)
      if (patches.length > 0) {
        get().enqueuePatch({
          id: generateUuid(),
          ts: Date.now(),
          source: "ui",
          nodes: patches,
        })
      }
    }

    // Queue persistence for exactly this node id through existing debounced pipeline.
    queueNodesForPersistence(
      () => ({
        boardId: get().boardId,
        rootId: get().rootId,
        nodes: get().nodes,
      }),
      new Set(),
      new Set([id]),
    )
  },

  setEdgesPersist: (edgesOrUpdater) => {
    const recording = get().historyRecording
    const scopeKey = getScopeKey(get())
    const prevEdges = get().edges

    const nextEdges =
      typeof edgesOrUpdater === "function"
        ? (edgesOrUpdater as (prev: LinkEdge[]) => LinkEdge[])(prevEdges)
        : edgesOrUpdater

    set({ edges: nextEdges })

    if (recording) {
      const patches = diffEdges(sanitizeEdges(prevEdges), sanitizeEdges(nextEdges))
      if (patches.length > 0) {
        get().enqueuePatch({
          id: generateUuid(),
          ts: Date.now(),
          source: "ui",
          edges: patches,
        })
      }
    }

    scheduleEdgePersistFromDiff(prevEdges, nextEdges, scopeKey, () => ({
      boardId: get().boardId,
      rootId: get().rootId,
      edges: get().edges,
      nodes: get().nodes,
    }))
  },

  /**
   * Targeted edge update path for hot edge interactions (label/control point).
   * Keeps persistence behavior aligned with setEdgesPersist while avoiding
   * repeated full-list scans in callsites.
   */
  updateEdgeByIdPersist: (id, updater) => {
    const recording = get().historyRecording
    const prevEdges = get().edges
    const prevEdge = prevEdges.find((edge) => edge.id === id)
    if (!prevEdge) return

    const nextEdge = updater(prevEdge)
    if (nextEdge === prevEdge) return

    const nextEdges = prevEdges.map((edge) => (edge.id === id ? nextEdge : edge))

    set({ edges: nextEdges })

    if (recording) {
      const touchedIds = new Set([id])
      const patches = diffEdgesById(sanitizeEdges(prevEdges), sanitizeEdges(nextEdges), touchedIds)
      if (patches.length > 0) {
        get().enqueuePatch({
          id: generateUuid(),
          ts: Date.now(),
          source: "ui",
          edges: patches,
        })
      }
    }

    queueEdgesForPersistence(
      () => ({
        boardId: get().boardId,
        rootId: get().rootId,
        edges: get().edges,
        nodes: get().nodes,
      }),
      new Set(),
      new Set([id]),
    )
  },

  // --- ReactFlow-driven changes (background diff + persist) ---

  onNodesChange: (changes) => {
    const boardId = get().boardId
    const scopeKey = getScopeKey(get())
    if (!boardId) return

    const recording = get().historyRecording
    const prevNodes = get().nodes
    const prevNodesById = get().nodesById
    const touchedNodeIds = new Set<string>()
    for (const ch of changes) {
      if (typeof (ch as { id?: unknown }).id === 'string') {
        touchedNodeIds.add((ch as { id: string }).id)
      }
    }
    const hasDragStart = changes.some(
      (ch) => ch.type === "position" && ch.dragging === true,
    )
    const hasDragEnd = changes.some(
      (ch) => ch.type === "position" && ch.dragging === false,
    )
    const hasResizeStart = changes.some(
      (ch) => ch.type === "dimensions" && ch.resizing === true,
    )
    const hasResizeEnd = changes.some(
      (ch) => ch.type === "dimensions" && ch.resizing === false,
    )
    const dragSnapshot = recording
      ? get().dragSnapshotNodes ?? (hasDragStart ? sanitizeNodes(prevNodes) : null)
      : null
    const resizeSnapshot = recording
      ? get().resizeSnapshotNodes ?? (hasResizeStart ? sanitizeNodes(prevNodes) : null)
      : null

    let attachedIndex = get().attachedPointIdsByNode
    let attachedIndexDirty = false
    let draggingNodeIds = get().draggingNodeIds
    let draggingDirty = false

    const ensureDraggingIds = () => {
      if (!draggingDirty) {
        draggingNodeIds = new Set(draggingNodeIds)
        draggingDirty = true
      }
    }

    const ensureAttachedIndex = () => {
      if (!attachedIndexDirty) {
        attachedIndex = cloneAttachedPointIdsByNode(attachedIndex)
        attachedIndexDirty = true
      }
    }

    const updateAttachedIndex = (nodeId: string, prevAttached?: string, nextAttached?: string) => {
      if (prevAttached === nextAttached) return
      ensureAttachedIndex()
      if (prevAttached) {
        const set = attachedIndex.get(prevAttached)
        if (set) {
          set.delete(nodeId)
          if (set.size === 0) attachedIndex.delete(prevAttached)
        }
      }
      if (nextAttached) {
        let set = attachedIndex.get(nextAttached)
        if (!set) {
          set = new Set()
          attachedIndex.set(nextAttached, set)
        }
        set.add(nodeId)
      }
    }

    // fast path: only selection + intermediate drag (no persistence at all)
    const onlyTransient = changes.every((ch) => {
      if (ch.type === "select") return true
      if (ch.type === "position" && ch.dragging) return true
      return false
    })

    let nextNodes = applyNodeChanges(changes, prevNodes)
    let nextNodesById = updateNodesById(get().nodesById, nextNodes, changes)
    let nodesChanged = false

    const pointOffset = POINT_NODE_SIZE / 2
    const nextById = new Map(nextNodes.map(n => [n.id, n]))

    const applyNodeUpdate = (id: string, updater: (node: NoteNode) => NoteNode) => {
      const node = nextById.get(id)
      if (!node) return
      const updated = updater(node)
      if (updated !== node) {
        nextById.set(id, updated)
        nodesChanged = true
        touchedNodeIds.add(id)
      }
    }

    const isPositionChangeWithId = (
      ch: NodeChange<NoteNode>,
    ): ch is NodeChange<NoteNode> & { id: string; dragging?: boolean } =>
      ch.type === "position" && typeof (ch as { id?: unknown }).id === "string"

    for (const ch of changes) {
      if (!isPositionChangeWithId(ch)) continue
      if (ch.dragging === true) {
        ensureDraggingIds()
        draggingNodeIds.add(ch.id)
      } else if (ch.dragging === false) {
        ensureDraggingIds()
        draggingNodeIds.delete(ch.id)
      }
    }

    for (const ch of changes) {
      if (ch.type === "add" && ch.item && isPointNode(ch.item)) {
        const attachedTo = (ch.item.data as { attachedToNodeId?: string }).attachedToNodeId
        if (attachedTo) {
          updateAttachedIndex(ch.item.id, undefined, attachedTo)
        }
      }
      if (ch.type === "remove" && ch.id) {
        const prev = prevNodesById.get(ch.id)
        if (prev && isPointNode(prev)) {
          const attachedTo = (prev.data as { attachedToNodeId?: string }).attachedToNodeId
          if (attachedTo) {
            updateAttachedIndex(prev.id, attachedTo, undefined)
          }
        }
      }
    }

    // Detach point nodes when drag begins.
    for (const ch of changes) {
      if (!isPositionChangeWithId(ch) || !ch.dragging) continue
      const node = nextById.get(ch.id)
      if (!node || !isPointNode(node)) continue
      const data = node.data as { attachedToNodeId?: string; attachedDirection?: { x: number; y: number } }
      if (!data.attachedToNodeId) continue
      updateAttachedIndex(node.id, data.attachedToNodeId, undefined)
      applyNodeUpdate(node.id, n => ({
        ...n,
        data: { ...n.data, attachedToNodeId: undefined, attachedDirection: undefined },
      }))
    }

    // Snap point nodes to targets on drag end.
    for (const ch of changes) {
      if (!isPositionChangeWithId(ch) || ch.dragging !== false) continue
      const node = nextById.get(ch.id)
      if (!node || !isPointNode(node)) continue
      const center = { x: node.position.x + pointOffset, y: node.position.y + pointOffset }
      const target = findAttachTarget(center, nextNodes)
      if (!target) {
        applyNodeUpdate(node.id, n => ({
          ...n,
          data: { ...n.data, attachedToNodeId: undefined, attachedDirection: undefined },
        }))
        continue
      }

      const attach = computeAttachment(target, center)
      updateAttachedIndex(
        node.id,
        (node.data as { attachedToNodeId?: string }).attachedToNodeId,
        target.id,
      )
      applyNodeUpdate(node.id, n => ({
        ...n,
        position: { x: attach.point.x - pointOffset, y: attach.point.y - pointOffset },
        data: { ...n.data, attachedToNodeId: target.id, attachedDirection: attach.direction },
      }))
    }

    // Keep attached points aligned while their target node moves.
    const movedNodeIds = new Set(
      changes
        .filter(isPositionChangeWithId)
        .map(ch => ch.id),
    )

    if (movedNodeIds.size > 0) {
      const attachedPointIds = new Set<string>()
      for (const movedNodeId of movedNodeIds) {
        const pointIds = attachedIndex.get(movedNodeId)
        if (!pointIds) continue
        for (const pointId of pointIds) {
          const node = nextById.get(pointId)
          if (!node || !isPointNode(node)) continue
          const data = node.data as { attachedToNodeId?: string; attachedDirection?: { x: number; y: number } }
          if (!data.attachedToNodeId) continue
          const target = nextById.get(data.attachedToNodeId)
          if (!target || isPointNode(target)) continue
          const targetCenter = nodeCenter(target)
          const dir = data.attachedDirection ?? {
            x: node.position.x + pointOffset - targetCenter.x,
            y: node.position.y + pointOffset - targetCenter.y,
          }
          const boundary = { x: targetCenter.x + dir.x, y: targetCenter.y + dir.y }
          applyNodeUpdate(node.id, n => ({
            ...n,
            position: { x: boundary.x - pointOffset, y: boundary.y - pointOffset },
            data: { ...n.data, attachedToNodeId: target.id, attachedDirection: dir },
          }))
          attachedPointIds.add(node.id)
        }
      }

      if (attachedPointIds.size > 0) {
        const edgeIds = new Set(
          get()
            .edges
            .filter(
              (e) =>
                attachedPointIds.has(e.source) ||
                attachedPointIds.has(e.target),
            )
            .map((e) => e.id),
        )

        if (edgeIds.size > 0) {
          queueEdgesForPersistence(
            () => ({
              boardId: get().boardId,
              rootId: get().rootId,
              edges: get().edges,
              nodes: get().nodes,
            }),
            new Set(),
            edgeIds,
          )
        }
      }
    }

    if (nodesChanged) {
      nextNodes = nextNodes.map(n => nextById.get(n.id) ?? n)
      nextNodesById = buildNodesById(nextNodes)
    }
    set({
      nodes: nextNodes,
      nodesById: nextNodesById,
      attachedPointIdsByNode: attachedIndexDirty ? attachedIndex : get().attachedPointIdsByNode,
    })

    if (draggingDirty) {
      set({
        draggingNodeIds,
        isDraggingNodes: draggingNodeIds.size > 0,
      })
    }

    if (recording) {
      if (hasDragEnd && dragSnapshot) {
        const patches = diffNodesById(dragSnapshot, sanitizeNodes(nextNodes), touchedNodeIds)
        if (patches.length > 0) {
      get().enqueuePatch({
            id: generateUuid(),
            ts: Date.now(),
            source: "ui",
            nodes: patches,
          }, { coalesce: false })
        }
        set({ dragSnapshotNodes: null })
      } else if (hasDragStart && dragSnapshot) {
        set({ dragSnapshotNodes: dragSnapshot })
      } else if (hasResizeEnd && resizeSnapshot) {
        const patches = diffNodesById(resizeSnapshot, sanitizeNodes(nextNodes), touchedNodeIds)
        if (patches.length > 0) {
          get().enqueuePatch({
            id: generateUuid(),
            ts: Date.now(),
            source: "ui",
            nodes: patches,
          }, { coalesce: false })
        }
        set({ resizeSnapshotNodes: null })
      } else if (hasResizeStart && resizeSnapshot) {
        set({ resizeSnapshotNodes: resizeSnapshot })
      } else if (!hasDragStart && !hasDragEnd && !hasResizeStart && !hasResizeEnd) {
        const patches = diffNodesById(sanitizeNodes(prevNodes), sanitizeNodes(nextNodes), touchedNodeIds)
        if (patches.length > 0) {
          get().enqueuePatch({
            id: generateUuid(),
            ts: Date.now(),
            source: "ui",
            nodes: patches,
          })
        }
      }
    }

    if (onlyTransient) return

    const isResizingAtTime = get().isResizingNode

    scheduleNodePersistFromChanges(
      prevNodes,
      nextNodes,
      scopeKey,
      changes,
      isResizingAtTime,
      () => ({
        boardId: get().boardId,
        rootId: get().rootId,
        nodes: get().nodes,
        deletedNodes: get().deletedNodes,
      }),
      set,
    )

    const movedPointIds = new Set(
      changes
        .filter((ch): ch is NodeChange<NoteNode> & { id: string } =>
          ch.type === "position" &&
          ch.dragging === false &&
          typeof ch.id === "string",
        )
        .map((ch) => ch.id),
    )

    if (movedPointIds.size > 0) {
      const updatedPointIds = new Set(
        nextNodes
          .filter((n) => movedPointIds.has(n.id))
          .filter((n) => isPointNode(n))
          .map((n) => n.id),
      )

      if (updatedPointIds.size > 0) {
        const edgeIds = new Set(
          get()
            .edges
            .filter(
              (e) =>
                updatedPointIds.has(e.source) ||
                updatedPointIds.has(e.target),
            )
            .map((e) => e.id),
        )

        if (edgeIds.size > 0) {
          queueEdgesForPersistence(
            () => ({
              boardId: get().boardId,
              rootId: get().rootId,
              edges: get().edges,
              nodes: get().nodes,
            }),
            new Set(),
            edgeIds,
          )
        }
      }
    }

    const selectedPointIds = new Set(
      nextNodes
        .filter((n) => n.selected && isPointNode(n))
        .map((n) => n.id),
    )

    // If a point endpoint is selected (e.g. dragging), keep its edge selected too.
    let edgesForSelection = get().edges
    if (selectedPointIds.size > 0) {
      let edgesChanged = false
      const nextEdges = edgesForSelection.map((edge) => {
        if (!selectedPointIds.has(edge.source) && !selectedPointIds.has(edge.target)) {
          return edge
        }
        if (edge.selected) return edge
        edgesChanged = true
        return { ...edge, selected: true }
      })
      if (edgesChanged) {
        set({ edges: nextEdges })
        edgesForSelection = nextEdges
      }
    }

    // Endpoint visibility follows edge selection (edge-selected => both endpoints active).
    const activePointIds = new Set<string>()
    for (const edge of edgesForSelection) {
      if (!edge.selected) continue
      activePointIds.add(edge.source)
      activePointIds.add(edge.target)
    }

    // Also allow clearing active endpoints when nothing is selected anymore.
    if (
      activePointIds.size > 0 ||
      nextNodes.some(n => isPointNode(n) && (n.data as { endpointActive?: boolean }).endpointActive)
    ) {
      const selectMode = get().isSelectMode
      const toggledNodes = nextNodes.map((n) => {
        if (!isPointNode(n)) return n
        const shouldActive = activePointIds.has(n.id)
        const data = n.data as { endpointActive?: boolean }
        if (
          data.endpointActive === shouldActive &&
          n.draggable === shouldActive &&
          n.selectable === (shouldActive || selectMode)
        ) {
          return n
        }
        return {
          ...n,
          draggable: shouldActive,
          selectable: shouldActive || selectMode,
          data: { ...n.data, endpointActive: shouldActive },
        }
      })

      set({ nodes: toggledNodes, nodesById: buildNodesById(toggledNodes) })
    }
  },

  onEdgesChange: (changes) => {
    const boardId = get().boardId
    const scopeKey = getScopeKey(get())
    if (!boardId) return

    const recording = get().historyRecording
    const prevEdges = get().edges
    const prevNodes = get().nodes
    const touchedEdgeIds = new Set<string>()
    for (const ch of changes) {
      if (typeof (ch as { id?: unknown }).id === 'string') {
        touchedEdgeIds.add((ch as { id: string }).id)
      }
    }

    // fast path: selection-only
    const onlySelect = changes.every((ch) => ch.type === "select")

    const updatedEdges = applyEdgeChanges(changes, prevEdges)
    set({ edges: updatedEdges })

    if (onlySelect) {
      const activePointIds = new Set<string>()
      for (const edge of updatedEdges) {
        if (!edge.selected) continue
        activePointIds.add(edge.source)
        activePointIds.add(edge.target)
      }

      if (activePointIds.size > 0 || prevNodes.some(n => isPointNode(n) && (n.data as { endpointActive?: boolean }).endpointActive)) {
        const selectMode = get().isSelectMode
        const nextNodes = prevNodes.map((n) => {
          if (!isPointNode(n)) return n
          const shouldActive = activePointIds.has(n.id)
          const data = n.data as { endpointActive?: boolean }
          if (
            data.endpointActive === shouldActive &&
            n.draggable === shouldActive &&
            n.selectable === (shouldActive || selectMode)
          ) {
            return n
          }
          return {
            ...n,
            draggable: shouldActive,
            selectable: shouldActive || selectMode,
            data: { ...n.data, endpointActive: shouldActive },
          }
        })
        set({ nodes: nextNodes, nodesById: buildNodesById(nextNodes) })
      }
      return
    }

    if (recording) {
      const skipDerivedEdgeHistory = get().isDraggingNodes || get().isResizingNode
      if (!skipDerivedEdgeHistory) {
        const patches = diffEdgesById(sanitizeEdges(prevEdges), sanitizeEdges(updatedEdges), touchedEdgeIds)
        if (patches.length > 0) {
          get().enqueuePatch({
            id: generateUuid(),
            ts: Date.now(),
            source: "ui",
            edges: patches,
          })
        }
      }
    }

    scheduleEdgePersistFromChanges(
      prevEdges,
      updatedEdges,
      scopeKey,
      changes,
      () => ({
        boardId: get().boardId,
        rootId: get().rootId,
        edges: get().edges,
        nodes: get().nodes,
        deletedEdges: get().deletedEdges,
      }),
      set,
    )
  },

  onNodesDelete: (nodes) => {
    const updatedNodes = get().nodes.filter(
      (node) => !nodes.some((n) => n.id === node.id),
    )
    const deletedNodes = nodes.map((node) => ({
      ...node,
      data: { ...node.data, deletedAt: new Date().toISOString() },
    }))

    nodes.forEach((n) => {
      pendingNewNodes.delete(n.id)
      pendingUpdatedNodes.delete(n.id)
    })

    set({
      nodes: updatedNodes,
      deletedNodes: [...get().deletedNodes, ...deletedNodes],
    })
    // DB delete is covered via onNodesChange's background diff
  },

  onEdgesDelete: (edges) => {
    const deletedEdgeIds = new Set(edges.map((edge) => edge.id))
    const deletedPointIds = new Set<string>()
    const nodesById = get().nodesById
    for (const edge of edges) {
      const sourceNode = nodesById.get(edge.source)
      const targetNode = nodesById.get(edge.target)
      if (sourceNode && isPointNode(sourceNode)) deletedPointIds.add(sourceNode.id)
      if (targetNode && isPointNode(targetNode)) deletedPointIds.add(targetNode.id)
    }

    const updatedEdges = get().edges.filter(
      (edge) => !deletedEdgeIds.has(edge.id),
    )
    const deletedEdges = edges.map((edge) => {
      const link = edge.data as Link
      return {
        ...edge,
        data: { ...link, deletedAt: new Date().toISOString() },
      }
    })

    edges.forEach((e) => {
      pendingNewEdges.delete(e.id)
      pendingUpdatedEdges.delete(e.id)
    })

    const updatedNodes = deletedPointIds.size > 0
      ? get().nodes.filter((node) => !deletedPointIds.has(node.id))
      : get().nodes
    const updatedAttachedIndex = deletedPointIds.size > 0
      ? buildAttachedPointIdsByNode(updatedNodes)
      : get().attachedPointIdsByNode

    set({
      edges: updatedEdges,
      deletedEdges: [...get().deletedEdges, ...deletedEdges],
      nodes: updatedNodes,
      nodesById: deletedPointIds.size > 0 ? buildNodesById(updatedNodes) : get().nodesById,
      attachedPointIdsByNode: updatedAttachedIndex,
    })
    // DB delete is covered via onEdgesChange's background diff
  },


  setDeletedNodes: (nodes) => set({ deletedNodes: nodes }),

  setDeletedEdges: (edges) => set({ deletedEdges: edges }),

  setIsResizingNode: (resizing) =>
    set((state) =>
      state.isResizingNode === resizing ? {} : { isResizingNode: resizing },
    ),

  setIsDragging: (dragging) =>
    set((state) =>
      state.isDragging === dragging ? {} : { isDragging: dragging },
    ),
  setIsSelectMode: (enabled) =>
    set((state) => {
      if (state.isSelectMode === enabled) return {}
      const nextNodes = state.nodes.map((n) => {
        if (!isPointNode(n)) return n
        const active = Boolean((n.data as { endpointActive?: boolean }).endpointActive)
        const nextSelectable = active || enabled
        if (n.selectable === nextSelectable) return n
        return { ...n, selectable: nextSelectable }
      })
      return {
        isSelectMode: enabled,
        nodes: nextNodes,
        nodesById: buildNodesById(nextNodes),
      }
    }),
  setIsMoving: (moving) =>
    set((state) =>
      state.isMoving === moving ? {} : { isMoving: moving },
    ),
  setZoom: (zoom) =>
    set((state) =>
      state.zoom === zoom ? {} : { zoom },
    ),

  graphViewports: loadViewportsFromStorage(),

  setGraphViewport: (boardId, vp) =>
    set((state) => {
      const next = {
        ...state.graphViewports,
        [boardId]: vp,
      }
      saveViewportToStorage(boardId, vp)
      return { graphViewports: next }
    }),

  historyPast: [],
  historyFuture: [],
  historyLimit: 80,
  historyRecording: true,
  dragSnapshotNodes: null,
  resizeSnapshotNodes: null,

  enqueuePatch: (patch, options) => {
    if (!hasPatchContent(patch)) return
    const coalesce = options?.coalesce !== false

    if (!coalesce) {
      get().flushPendingPatch()
      get().pushPatch(patch)
      return
    }

    if (!pendingHistoryPatch) {
      pendingHistoryPatch = patch
    } else if (canCoalescePatches(pendingHistoryPatch, patch)) {
      pendingHistoryPatch = mergePatches(pendingHistoryPatch, patch)
    } else {
      get().flushPendingPatch()
      pendingHistoryPatch = patch
    }

    if (historyCoalesceTimeout !== null) {
      clearTimeout(historyCoalesceTimeout)
    }
    historyCoalesceTimeout = setTimeout(() => {
      historyCoalesceTimeout = null
      get().flushPendingPatch()
    }, HISTORY_COALESCE_DELAY)
  },

  flushPendingPatch: () => {
    if (historyCoalesceTimeout !== null) {
      clearTimeout(historyCoalesceTimeout)
      historyCoalesceTimeout = null
    }
    if (!pendingHistoryPatch) return
    const patch = pendingHistoryPatch
    pendingHistoryPatch = null
    get().pushPatch(patch)
  },

  pushPatch: (patch) =>
    set((state) => {
      if (!hasPatchContent(patch)) return {}
      const past = [...state.historyPast, patch]
      if (past.length > state.historyLimit) {
        past.splice(0, past.length - state.historyLimit)
      }
      return {
        historyPast: past,
        historyFuture: [],
      }
    }),

  undo: () => {
    get().flushPendingPatch()
    const state = get()
    const patch = state.historyPast[state.historyPast.length - 1]
    if (!patch) return

    const prevNodes = state.nodes
    const prevEdges = state.edges

    const nextNodes = patch.nodes
      ? applyNodePatches(state.nodes, patch.nodes, "undo")
      : state.nodes
    const nextEdges = patch.edges
      ? applyEdgePatches(state.edges, patch.edges, "undo")
      : state.edges

    set({
      historyRecording: false,
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [patch, ...state.historyFuture],
      nodes: nextNodes,
      edges: nextEdges,
      nodesById: buildNodesById(nextNodes),
      attachedPointIdsByNode: buildAttachedPointIdsByNode(nextNodes),
    })

    const scopeKey = getScopeKey(state)
    scheduleNodePersistFromDiff(prevNodes, nextNodes, scopeKey, () => ({
      boardId: get().boardId,
      rootId: get().rootId,
      nodes: get().nodes,
    }))
    scheduleEdgePersistFromDiff(prevEdges, nextEdges, scopeKey, () => ({
      boardId: get().boardId,
      rootId: get().rootId,
      edges: get().edges,
      nodes: get().nodes,
    }))

    setTimeout(() => set({ historyRecording: true }), 0)
  },

  redo: () => {
    get().flushPendingPatch()
    const state = get()
    const patch = state.historyFuture[0]
    if (!patch) return

    const prevNodes = state.nodes
    const prevEdges = state.edges

    const nextNodes = patch.nodes
      ? applyNodePatches(state.nodes, patch.nodes, "redo")
      : state.nodes
    const nextEdges = patch.edges
      ? applyEdgePatches(state.edges, patch.edges, "redo")
      : state.edges

    set({
      historyRecording: false,
      historyPast: [...state.historyPast, patch],
      historyFuture: state.historyFuture.slice(1),
      nodes: nextNodes,
      edges: nextEdges,
      nodesById: buildNodesById(nextNodes),
      attachedPointIdsByNode: buildAttachedPointIdsByNode(nextNodes),
    })

    const scopeKey = getScopeKey(state)
    scheduleNodePersistFromDiff(prevNodes, nextNodes, scopeKey, () => ({
      boardId: get().boardId,
      rootId: get().rootId,
      nodes: get().nodes,
    }))
    scheduleEdgePersistFromDiff(prevEdges, nextEdges, scopeKey, () => ({
      boardId: get().boardId,
      rootId: get().rootId,
      edges: get().edges,
      nodes: get().nodes,
    }))

    setTimeout(() => set({ historyRecording: true }), 0)
  },
}))
