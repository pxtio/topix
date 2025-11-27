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

// --- helpers ---

type Updater<T> = T | ((prev: T) => T)

const resolveUpdater = <T>(updater: Updater<T>, prev: T): T =>
  typeof updater === "function"
    ? (updater as (p: T) => T)(prev)
    : updater

// --- persist conditions ---

function shouldPersistNodeChange(
  ch: NodeChange<NoteNode>,
  isResizing: boolean,
): boolean {
  switch (ch.type) {
    case "select":
      return false
    case "remove":
      // handled as delete
      return false
    case "position":
      // persist only when drag ends
      return ch.dragging === false
    case "dimensions":
      // avoid spam while resizing
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

// --- node persistence helpers ---

function scheduleNodeFlush(get: () => { boardId?: string }) {
  if (nodePersistTimeout !== null) {
    clearTimeout(nodePersistTimeout)
  }

  nodePersistTimeout = setTimeout(async () => {
    nodePersistTimeout = null

    const { boardId } = get()
    if (!boardId) {
      pendingNewNodes.clear()
      pendingUpdatedNodes.clear()
      return
    }

    const newNodes = Array.from(pendingNewNodes.values())
    const updatedNodes = Array.from(pendingUpdatedNodes.values())

    pendingNewNodes.clear()
    pendingUpdatedNodes.clear()

    try {
      if (newNodes.length > 0) {
        // addNotes expects Note[]
        await addNotes(
          boardId,
          newNodes.map((n) => n.data as Note),
        )
      }

      if (updatedNodes.length > 0) {
        await Promise.all(
          updatedNodes.map((n) =>
            updateNote(
              boardId,
              n.id,
              n.data as Partial<Note>,
            ),
          ),
        )
      }
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

  // New nodes: go into pendingNewNodes, and are NOT put in updated queue
  for (const id of addedIds) {
    const node = byId.get(id)
    if (!node) continue
    pendingNewNodes.set(id, node)
    pendingUpdatedNodes.delete(id)
  }

  // Updated nodes: only if not already considered "new"
  for (const id of updatedIds) {
    if (pendingNewNodes.has(id)) continue
    const node = byId.get(id)
    if (!node) continue
    pendingUpdatedNodes.set(id, node)
  }

  scheduleNodeFlush(() => ({ boardId }))
}

// --- edge persistence helpers ---

function scheduleEdgeFlush(get: () => { boardId?: string }) {
  if (edgePersistTimeout !== null) {
    clearTimeout(edgePersistTimeout)
  }

  edgePersistTimeout = setTimeout(async () => {
    edgePersistTimeout = null

    const { boardId } = get()
    if (!boardId) {
      pendingNewEdges.clear()
      pendingUpdatedEdges.clear()
      return
    }

    const newEdges = Array.from(pendingNewEdges.values())
    const updatedEdges = Array.from(pendingUpdatedEdges.values())

    pendingNewEdges.clear()
    pendingUpdatedEdges.clear()

    try {
      if (newEdges.length > 0) {
        // addLinks expects Link[]
        await addLinks(
          boardId,
          newEdges.map((e) => e.data as Link),
        )
      }

      if (updatedEdges.length > 0) {
        await Promise.all(
          updatedEdges.map((e) =>
            updateLink(
              boardId,
              e.id,
              e.data as Partial<Link>,
            ),
          ),
        )
      }
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

  // New edges
  for (const id of addedIds) {
    const edge = byId.get(id)
    if (!edge) continue
    pendingNewEdges.set(id, edge)
    pendingUpdatedEdges.delete(id)
  }

  // Updated edges
  for (const id of updatedIds) {
    if (pendingNewEdges.has(id)) continue
    const edge = byId.get(id)
    if (!edge) continue
    pendingUpdatedEdges.set(id, edge)
  }

  scheduleEdgeFlush(() => ({ boardId }))
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

  // --- flexible setters ---

  setNodes: (nodesOrUpdater) =>
    set((state) => ({
      nodes: resolveUpdater<NoteNode[]>(nodesOrUpdater, state.nodes),
    })),

  setEdges: (edgesOrUpdater) =>
    set((state) => ({
      edges: resolveUpdater<LinkEdge[]>(edgesOrUpdater, state.edges),
    })),

  setNodesPersist: (nodesOrUpdater) => {
    const boardId = get().boardId
    const prevNodes = get().nodes
    const prevIds = new Set(prevNodes.map(n => n.id))

    // 1) compute next nodes from updater or value
    const nextNodes =
      typeof nodesOrUpdater === 'function'
        ? (nodesOrUpdater as (prev: NoteNode[]) => NoteNode[])(prevNodes)
        : nodesOrUpdater

    const nextIds = new Set(nextNodes.map(n => n.id))

    // 2) build maps and diff
    const prevById = new Map(prevNodes.map(n => [n.id, n]))

    const addedIds = new Set<string>()
    const removedIds = new Set<string>()
    const updatedIds = new Set<string>()

    // additions + updates
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

    // removals
    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        removedIds.add(id)
      }
    }

    // 3) persist removals immediately (fire-and-forget)
    if (boardId && removedIds.size > 0) {
      removedIds.forEach(id => {
        pendingNewNodes.delete(id)
        pendingUpdatedNodes.delete(id)
        void removeNote(boardId, id)
      })
    }

    // 4) first update the store so get().nodes is the latest snapshot
    set({ nodes: nextNodes })

    // 5) queue adds + updates for debounced addNotes / updateNote
    if (addedIds.size > 0 || updatedIds.size > 0) {
      queueNodesForPersistence(
        () => ({
          boardId: get().boardId,
          nodes: get().nodes, // ✅ now this is nextNodes
        }),
        addedIds,
        updatedIds,
      )
    }
  },

  setEdgesPersist: (edgesOrUpdater) => {
    const boardId = get().boardId
    const prevEdges = get().edges
    const prevIds = new Set(prevEdges.map(e => e.id))

    // 1) compute next edges
    const nextEdges =
      typeof edgesOrUpdater === 'function'
        ? (edgesOrUpdater as (prev: LinkEdge[]) => LinkEdge[])(prevEdges)
        : edgesOrUpdater

    const nextIds = new Set(nextEdges.map(e => e.id))

    const prevById = new Map(prevEdges.map(e => [e.id, e]))

    const addedIds = new Set<string>()
    const removedIds = new Set<string>()
    const updatedIds = new Set<string>()

    // additions + updates
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

    // removals
    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        removedIds.add(id)
      }
    }

    // 3) persist removals
    if (boardId && removedIds.size > 0) {
      removedIds.forEach(id => {
        pendingNewEdges.delete(id)
        pendingUpdatedEdges.delete(id)
        void removeLink(boardId, id)
      })
    }

    // 4) update store first
    set({ edges: nextEdges })

    // 5) queue adds + updates
    if (addedIds.size > 0 || updatedIds.size > 0) {
      queueEdgesForPersistence(
        () => ({
          boardId: get().boardId,
          edges: get().edges, // ✅ now nextEdges
        }),
        addedIds,
        updatedIds,
      )
    }
  },

  // --- main graph logic with persistence ---

  onNodesChange: (changes) => {
    const boardId = get().boardId
    if (!boardId) return

    const prevNodes = get().nodes
    const prevIds = new Set(prevNodes.map((n) => n.id))

    // 1) apply to local state
    const updatedNodes = applyNodeChanges(changes, prevNodes)
    const changeIdMap = new Map<string, string>()

    changes.forEach((change) => {
      if (change.type === "add") {
        changeIdMap.set(change.item.id, change.type)
      } else {
        changeIdMap.set(change.id, change.type)
      }
    })

    updatedNodes.forEach((node) => {
      if (changeIdMap.has(node.id)) {
        const note = convertNodeToNote(boardId, node)
        const op = changeIdMap.get(node.id)

        switch (op) {
          case "add": {
            node.data = { ...note, createdAt: new Date().toISOString() }
            return node
          }
          case "remove": {
            node.data = { ...note, deletedAt: new Date().toISOString() }
            set({ deletedNodes: [...get().deletedNodes, node] })
            return node
          }
          default: {
            node.data = { ...note, updatedAt: new Date().toISOString() }
            return node
          }
        }
      }
    })

    set({ nodes: updatedNodes })

    const nextNodes = updatedNodes
    const nextById = new Map(nextNodes.map((n) => [n.id, n]))

    // 2) compute explicit + implicit deletes
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

    // Clean removed ones from queues (never persist something we removed)
    removedIds.forEach((id) => {
      pendingNewNodes.delete(id)
      pendingUpdatedNodes.delete(id)
    })

    // 3) persist deletions immediately (fire-and-forget)
    if (removedIds.size > 0) {
      removedIds.forEach((id) => {
        void removeNote(boardId, id)
      })
    }

    // 4) collect added + updated ids for debounced add/update
    const isResizingNode = get().isResizingNode

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
      if (shouldPersistNodeChange(ch, isResizingNode)) {
        candidateUpdateIds.add(id)
      }
    }

    // updates = those that should be persisted but are not "new"
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
          nodes: get().nodes,
        }),
        addedIds,
        updatedIds,
      )
    }
  },

  onEdgesChange: (changes) => {
    const boardId = get().boardId
    if (!boardId) return

    const prevEdges = get().edges
    const prevIds = new Set(prevEdges.map((e) => e.id))

    // 1) apply locally
    const updatedEdges = applyEdgeChanges(changes, prevEdges)
    const changeIdMap = new Map<string, string>()

    changes.forEach((change) => {
      if (change.type === "add") {
        changeIdMap.set(change.item.id, change.type)
      } else {
        changeIdMap.set(change.id, change.type)
      }
    })

    updatedEdges.forEach((edge) => {
      if (changeIdMap.has(edge.id)) {
        const link = convertEdgeToLink(boardId, edge)
        const op = changeIdMap.get(edge.id)

        switch (op) {
          case "add": {
            edge.data = { ...link, createdAt: new Date().toISOString() }
            return edge
          }
          case "remove": {
            edge.data = { ...link, deletedAt: new Date().toISOString() }
            set({ deletedEdges: [...get().deletedEdges, edge] })
            return edge
          }
          default: {
            edge.data = { ...link, updatedAt: new Date().toISOString() }
            return edge
          }
        }
      }
    })

    set({ edges: updatedEdges })

    const nextEdges = updatedEdges
    const nextById = new Map(nextEdges.map((e) => [e.id, e]))

    // 2) deletes (explicit + diff)
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

    // Clean them from queues
    removedIds.forEach((id) => {
      pendingNewEdges.delete(id)
      pendingUpdatedEdges.delete(id)
    })

    // 3) persist deletions immediately
    if (removedIds.size > 0) {
      removedIds.forEach((id) => {
        void removeLink(boardId, id)
      })
    }

    // 4) collect added + updated ids for add/update
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
          edges: get().edges,
        }),
        addedIds,
        updatedIds,
      )
    }
  },

  onNodesDelete: (nodes) => {
    const updatedNodes = get().nodes.filter(
      (node) => !nodes.some((n) => n.id === node.id),
    )
    const deletedNodes = nodes.map((node) => ({
      ...node,
      data: { ...node.data, deletedAt: new Date().toISOString() },
    }))

    // Clean from queues just in case
    nodes.forEach((n) => {
      pendingNewNodes.delete(n.id)
      pendingUpdatedNodes.delete(n.id)
    })

    set({
      nodes: updatedNodes,
      deletedNodes: [...get().deletedNodes, ...deletedNodes],
    })
    // DB delete already covered via onNodesChange diff/remove
  },

  onEdgesDelete: (edges) => {
    const updatedEdges = get().edges.filter(
      (edge) => !edges.some((e) => e.id === edge.id),
    )
    const deletedEdges = edges.map((edge) => {
      const boardId = get().boardId
      if (!boardId) return edge
      const link = convertEdgeToLink(boardId, edge)
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
    // DB delete already covered via onEdgesChange
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

    const newEdges = rfAddEdge(newEdge, get().edges)

    if (newEdges.length > get().edges.length) {
      set({ edges: newEdges })

      // Consider this a "new" link for persistence
      queueEdgesForPersistence(
        () => ({
          boardId: get().boardId,
          edges: get().edges,
        }),
        new Set([edgeId]),
        new Set(),
      )

      return newEdge
    }

    return undefined
  },

  setDeletedNodes: (nodes) => set({ deletedNodes: nodes }),

  setDeletedEdges: (edges) => set({ deletedEdges: edges }),

  setIsResizingNode: (resizing) => set({ isResizingNode: resizing }),

  graphViewports: {},

  setGraphViewport: (boardId, vp) =>
    set((state) => ({
      graphViewports: {
        ...state.graphViewports,
        [boardId]: vp,
      },
    })),
}))