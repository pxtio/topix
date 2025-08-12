import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from "@xyflow/react"
import type { LinkEdge, NoteNode } from "../types/flow"
import { create } from "zustand/react"
import { convertEdgeToLink, convertNodeToNote } from "../utils/graph"
import { generateUuid } from "@/lib/common"


export interface GraphStore {
  boardId?: string
  setBoardId: (boardId: string | undefined) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  nodes: NoteNode[]
  edges: LinkEdge[]
  deletedNodes: NoteNode[]
  deletedEdges: LinkEdge[]
  setNodes: (nodes: NoteNode[]) => void
  setEdges: (edges: LinkEdge[]) => void
  onNodesChange: (changes: NodeChange<NoteNode>[]) => void
  onEdgesChange: (changes: EdgeChange<LinkEdge>[]) => void
  onNodesDelete: (nodes: NoteNode[]) => void
  onEdgesDelete: (edges: LinkEdge[]) => void
  onConnect: (params: Connection) => LinkEdge | undefined
  setDeletedNodes: (nodes: NoteNode[]) => void
  setDeletedEdges: (edges: LinkEdge[]) => void
}


export const useGraphStore = create<GraphStore>((set, get) => ({
  boardId: undefined,

  setBoardId: (boardId) => set({ boardId }),

  isLoading: false,

  setIsLoading: (loading) => set({ isLoading: loading }),

  nodes: [],

  edges: [],

  deletedNodes: [],

  deletedEdges: [],

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    const boardId = get().boardId
    if (!boardId) return


    const updatedNodes = applyNodeChanges(changes, get().nodes)
    const changeIdMap = new Map<string, string>()

    changes.forEach(change => {
      if (change.type === 'add') {
        changeIdMap.set(change.item.id, change.type)
      } else {
        changeIdMap.set(change.id, change.type)
      }
    })

    updatedNodes.forEach(node => {
      if (changeIdMap.has(node.id)) {
        const note = convertNodeToNote(boardId, node)
        const op = changeIdMap.get(node.id)

        switch (op) {
          case 'add': {
            node.data = { ...note, createdAt: new Date().toISOString() }
            return node
          }
          case 'remove': {
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
    set({
      nodes: updatedNodes
    })
  },

  onEdgesChange: (changes) => {
    const boardId = get().boardId

    if (!boardId) return

    const updatedEdges = applyEdgeChanges(changes, get().edges)
    const changeIdMap = new Map<string, string>()

    changes.forEach(change => {
      if (change.type === 'add') {
        changeIdMap.set(change.item.id, change.type)
      } else {
        changeIdMap.set(change.id, change.type)
      }
    })

    updatedEdges.forEach(edge => {
      if (changeIdMap.has(edge.id)) {
        const link = convertEdgeToLink(boardId, edge)
        const op = changeIdMap.get(edge.id)
        switch (op) {
          case 'add': {
            edge.data = { ...link, createdAt: new Date().toISOString() }
            return edge
          }
          case 'remove': {
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
    set({
      edges: updatedEdges
    })
  },

  onNodesDelete: (nodes) => {
    const updatedNodes = get().nodes.filter(node => !nodes.some(n => n.id === node.id))
    const deletedNodes = nodes.map(node => ({ ...node, data: { ...node.data, deletedAt: new Date().toISOString() } }))
    set({
      nodes: updatedNodes,
      deletedNodes: [...get().deletedNodes, ...deletedNodes]
    })
  },

  onEdgesDelete: (edges) => {
    const updatedEdges = get().edges.filter(edge => !edges.some(e => e.id === edge.id))
    const deletedEdges = edges.map(edge => {
      const boardId = get().boardId
      if (!boardId) return edge
      const link = convertEdgeToLink(boardId, edge)
      return { ...edge, data: { ...link, deletedAt: new Date().toISOString() } }
    })
    set({
      edges: updatedEdges,
      deletedEdges: [...get().deletedEdges, ...deletedEdges]
    })
  },

  onConnect: (params) => {
    const edgeId = generateUuid()
    const newEdge: LinkEdge = {
      ...params,
      id: edgeId
    }
    const newEdges = addEdge(newEdge, get().edges)
    if (newEdges.length > get().edges.length) {
      set({ edges: newEdges })
      return newEdge
    }
    return undefined
  },

  setDeletedNodes: (nodes) => set({ deletedNodes: nodes }),

  setDeletedEdges: (edges) => set({ deletedEdges: edges }),
}))