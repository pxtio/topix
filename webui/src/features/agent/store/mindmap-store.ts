import type { LinkEdge, NoteNode } from "@/features/board/types/flow"
import { create } from "zustand"


/**
 * Store for managing mind maps/notes converted from text answers.
 */
export interface MindMapStore {
  mindmaps: Map<string, { nodes: NoteNode[], edges: LinkEdge[], useAnchors?: boolean }[]>
  setMindMap: (boardId: string, nodes: NoteNode[], edges: LinkEdge[], useAnchors?: boolean) => void
  clearMindMap: (boardId: string) => void
}


/**
 * Create a Zustand store for managing mind maps/notes.
 */
export const useMindMapStore = create<MindMapStore>((set) => ({
  mindmaps: new Map(),

  setMindMap: (boardId, nodes, edges, useAnchors) => set((state) => {
    const newMindmaps = new Map(state.mindmaps)
    newMindmaps.set(
      boardId,
      [...(newMindmaps.get(boardId) || []), { nodes, edges, useAnchors }]
    )
    return { mindmaps: newMindmaps }
  }),

  clearMindMap: (boardId) => set((state) => {
    const newMindmaps = new Map(state.mindmaps)
    newMindmaps.delete(boardId)
    return { mindmaps: newMindmaps }
  })
}))
