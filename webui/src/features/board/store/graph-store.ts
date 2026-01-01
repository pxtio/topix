import {
  addEdge as rfAddEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from "@xyflow/react"
import { create } from "zustand/react"

import type { LinkEdge, NoteNode } from "../types/flow"
import type { Link } from "../types/link"
import type { Note } from "../types/note"

import { convertEdgeToLink, convertNodeToNote } from "../utils/graph"
import { generateUuid } from "@/lib/common"
import { createDefaultLinkStyle, type LinkStyle } from "../types/style"
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

// --- helpers ---

type Updater<T> = T | ((prev: T) => T)

const resolveUpdater = <T>(updater: Updater<T>, prev: T): T =>
  typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater

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

// --- debounced persistence state (module-level singletons) ---

// Nodes: separate queues for new vs updated, share one timer
const pendingNewNodes = new Map<string, NoteNode>()
const pendingUpdatedNodes = new Map<string, NoteNode>()
let nodePersistTimeout: ReturnType<typeof setTimeout> | null = null

// Edges: same idea
const pendingNewEdges = new Map<string, LinkEdge>()
const pendingUpdatedEdges = new Map<string, LinkEdge>()
let edgePersistTimeout: ReturnType<typeof setTimeout> | null = null

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
            nodes.map((n) => convertNodeToNote(n)),
          ),
        ),
      )

      await Promise.all(
        Array.from(updatedByBoard.entries()).map(([graphUid, nodes]) =>
          Promise.all(
            nodes.map((n) =>
              updateNote(
                graphUid,
                n.id,
                convertNodeToNote(n) as Partial<Note>,
              ),
            ),
          ),
        ),
      )
    } catch (err) {
      console.error("Failed to persist nodes", err)
    }
  }, DEBOUNCE_DELAY)
}

function queueNodesForPersistence(
  get: () => { boardId?: string; nodes: NoteNode[] },
  addedIds: Set<string>,
  updatedIds: Set<string>,
) {
  const { boardId, nodes } = get()
  if (!boardId) return
  if (addedIds.size === 0 && updatedIds.size === 0) return

  const byId = new Map(nodes.map((n) => [n.id, n]))

  for (const id of addedIds) {
    const node = byId.get(id)
    if (!node) continue
    pendingNewNodes.set(id, node)
    pendingUpdatedNodes.delete(id)
  }

  for (const id of updatedIds) {
    if (pendingNewNodes.has(id)) continue
    const node = byId.get(id)
    if (!node) continue
    pendingUpdatedNodes.set(id, node)
  }

  scheduleNodeFlush()
}

function scheduleEdgeFlush() {
  if (edgePersistTimeout !== null) {
    clearTimeout(edgePersistTimeout)
  }

  edgePersistTimeout = setTimeout(async () => {
    edgePersistTimeout = null

    const newEdges = Array.from(pendingNewEdges.values())
    const updatedEdges = Array.from(pendingUpdatedEdges.values())

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
            edges.map((e) => convertEdgeToLink(e)),
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
                convertEdgeToLink(e) as Partial<Link>,
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
  get: () => { boardId?: string; edges: LinkEdge[] },
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

  scheduleEdgeFlush()
}

// --- background helpers (diff + persist) ---

function scheduleNodePersistFromDiff(
  prevNodes: NoteNode[],
  nextNodes: NoteNode[],
  boardIdAtTime: string | undefined,
  get: () => { boardId?: string; nodes: NoteNode[] },
) {
  if (!boardIdAtTime) return

  setTimeout(() => {
    const { boardId, nodes } = get()
    if (!boardId || boardId !== boardIdAtTime) return

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
  boardIdAtTime: string | undefined,
  get: () => { boardId?: string; edges: LinkEdge[] },
) {
  if (!boardIdAtTime) return

  setTimeout(() => {
    const { boardId, edges } = get()
    if (!boardId || boardId !== boardIdAtTime) return

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
          edges,
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
  boardIdAtTime: string | undefined,
  changes: NodeChange<NoteNode>[],
  isResizingAtTime: boolean,
  get: () => { boardId?: string; nodes: NoteNode[]; deletedNodes: NoteNode[] },
  set: (
    partial:
      | Partial<GraphStore>
      | ((state: GraphStore) => Partial<GraphStore>),
  ) => void,
) {
  if (!boardIdAtTime) return

  setTimeout(() => {
    const state = get()
    const boardId = state.boardId
    if (!boardId || boardId !== boardIdAtTime) return

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
  boardIdAtTime: string | undefined,
  changes: EdgeChange<LinkEdge>[],
  get: () => { boardId?: string; edges: LinkEdge[]; deletedEdges: LinkEdge[] },
  set: (
    partial:
      | Partial<GraphStore>
      | ((state: GraphStore) => Partial<GraphStore>),
  ) => void,
) {
  if (!boardIdAtTime) return

  setTimeout(() => {
    const state = get()
    const boardId = state.boardId
    if (!boardId || boardId !== boardIdAtTime) return

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
          edges,
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
  setBoardId: (boardId: string | undefined) => void

  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  nodes: NoteNode[]
  edges: LinkEdge[]

  deletedNodes: NoteNode[]
  deletedEdges: LinkEdge[]

  isResizingNode: boolean
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
  isPanning: boolean
  setIsPanning: (panning: boolean) => void
  isZooming: boolean
  setIsZooming: (zooming: boolean) => void
  zoom: number
  setZoom: (zoom: number) => void

  setNodes: (nodes: Updater<NoteNode[]>) => void
  setEdges: (edges: Updater<LinkEdge[]>) => void

  setNodesPersist: (nodes: Updater<NoteNode[]>) => void
  setEdgesPersist: (edges: Updater<LinkEdge[]>) => void

  onNodesChange: (changes: NodeChange<NoteNode>[]) => void
  onEdgesChange: (changes: EdgeChange<LinkEdge>[]) => void
  onNodesDelete: (nodes: NoteNode[]) => void
  onEdgesDelete: (edges: LinkEdge[]) => void
  onConnect: (params: Connection, style?: LinkStyle) => LinkEdge | undefined

  setDeletedNodes: (nodes: NoteNode[]) => void
  setDeletedEdges: (edges: LinkEdge[]) => void
  setIsResizingNode: (resizing: boolean) => void

  graphViewports: Record<string, Viewport>
  setGraphViewport: (boardId: string, viewport: Viewport) => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  boardId: undefined,

  setBoardId: (boardId) => {
    // optional: clear/flush pending when board changes
    // pendingNewNodes.clear()
    // pendingUpdatedNodes.clear()
    // pendingNewEdges.clear()
    // pendingUpdatedEdges.clear()
    set({ boardId })
  },

  isLoading: false,

  setIsLoading: (loading) => set({ isLoading: loading }),

  nodes: [],
  edges: [],

  deletedNodes: [],
  deletedEdges: [],

  isResizingNode: false,
  isDragging: false,
  isPanning: false,
  isZooming: false,
  zoom: 1,

  // --- flexible setters ---

  setNodes: (nodesOrUpdater) =>
    set((state) => ({
      nodes: resolveUpdater<NoteNode[]>(nodesOrUpdater, state.nodes),
    })),

  setEdges: (edgesOrUpdater) =>
    set((state) => ({
      edges: resolveUpdater<LinkEdge[]>(edgesOrUpdater, state.edges),
    })),

  // --- set + background diff + debounced persist ---

  setNodesPersist: (nodesOrUpdater) => {
    const boardId = get().boardId
    const prevNodes = get().nodes

    const nextNodes =
      typeof nodesOrUpdater === "function"
        ? (nodesOrUpdater as (prev: NoteNode[]) => NoteNode[])(prevNodes)
        : nodesOrUpdater

    set({ nodes: nextNodes })

    scheduleNodePersistFromDiff(prevNodes, nextNodes, boardId, () => ({
      boardId: get().boardId,
      nodes: get().nodes,
    }))
  },

  setEdgesPersist: (edgesOrUpdater) => {
    const boardId = get().boardId
    const prevEdges = get().edges

    const nextEdges =
      typeof edgesOrUpdater === "function"
        ? (edgesOrUpdater as (prev: LinkEdge[]) => LinkEdge[])(prevEdges)
        : edgesOrUpdater

    set({ edges: nextEdges })

    scheduleEdgePersistFromDiff(prevEdges, nextEdges, boardId, () => ({
      boardId: get().boardId,
      edges: get().edges,
    }))
  },

  // --- ReactFlow-driven changes (background diff + persist) ---

  onNodesChange: (changes) => {
    const boardId = get().boardId
    if (!boardId) return

    const prevNodes = get().nodes

    // fast path: only selection + intermediate drag (no persistence at all)
    const onlyTransient = changes.every((ch) => {
      if (ch.type === "select") return true
      if (ch.type === "position" && ch.dragging) return true
      return false
    })

    const updatedNodes = applyNodeChanges(changes, prevNodes)
    set({ nodes: updatedNodes })

    if (onlyTransient) return

    const isResizingAtTime = get().isResizingNode

    scheduleNodePersistFromChanges(
      prevNodes,
      updatedNodes,
      boardId,
      changes,
      isResizingAtTime,
      () => ({
        boardId: get().boardId,
        nodes: get().nodes,
        deletedNodes: get().deletedNodes,
      }),
      set,
    )
  },

  onEdgesChange: (changes) => {
    const boardId = get().boardId
    if (!boardId) return

    const prevEdges = get().edges

    // fast path: selection-only
    const onlySelect = changes.every((ch) => ch.type === "select")

    const updatedEdges = applyEdgeChanges(changes, prevEdges)
    set({ edges: updatedEdges })

    if (onlySelect) return

    scheduleEdgePersistFromChanges(
      prevEdges,
      updatedEdges,
      boardId,
      changes,
      () => ({
        boardId: get().boardId,
        edges: get().edges,
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
    const updatedEdges = get().edges.filter(
      (edge) => !edges.some((e) => e.id === edge.id),
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

    set({
      edges: updatedEdges,
      deletedEdges: [...get().deletedEdges, ...deletedEdges],
    })
    // DB delete is covered via onEdgesChange's background diff
  },

  onConnect: (params, style) => {
    const boardId = get().boardId
    if (!boardId) return undefined

    const edgeId = generateUuid()
    const newEdge: LinkEdge = {
      ...params,
      id: edgeId,
    }

    newEdge.data = {
      id: edgeId,
      type: "link",
      version: 1,
      source: newEdge.source,
      target: newEdge.target,
      style: style || createDefaultLinkStyle(),
      createdAt: new Date().toISOString(),
      graphUid: boardId,
    } as Link

    const prevEdges = get().edges
    const newEdges = rfAddEdge(newEdge, prevEdges)

    if (newEdges.length > prevEdges.length) {
      set({ edges: newEdges })

      // treat as "new" edge for persistence
      scheduleEdgePersistFromDiff(prevEdges, newEdges, boardId, () => ({
        boardId: get().boardId,
        edges: get().edges,
      }))

      return newEdge
    }

    return undefined
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
  setIsPanning: (panning) =>
    set((state) =>
      state.isPanning === panning ? {} : { isPanning: panning },
    ),
  setIsZooming: (zooming) =>
    set((state) =>
      state.isZooming === zooming ? {} : { isZooming: zooming },
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
}))
