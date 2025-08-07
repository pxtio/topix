import type { LinkEdge, NoteNode } from "@/features/board/types/flow"
import { create } from "zustand"


/**
 * Store for managing mind maps converted from text answers.
 */
export interface MindMapStore {
  mindmaps: Map<string, { nodes: NoteNode[], edges: LinkEdge[] }>
  setMindMap: (boardId: string, nodes: NoteNode[], edges: LinkEdge[]) => void
  clearMindMap: (boardId: string) => void
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void
  inProcessingBoardId?: string
  setInProcessingBoardId: (boardId: string | undefined) => void
}


/**
 * Create a Zustand store for managing mind maps.
 */
export const useMindMapStore = create<MindMapStore>((set) => ({
  mindmaps: new Map(),

  setMindMap: (boardId, nodes, edges) => set((state) => {
    const newMindmaps = new Map(state.mindmaps)
    newMindmaps.set(boardId, { nodes, edges })
    return { mindmaps: newMindmaps }
  }),

  clearMindMap: (boardId) => set((state) => {
    const newMindmaps = new Map(state.mindmaps)
    newMindmaps.delete(boardId)
    return { mindmaps: newMindmaps }
  }),

  isProcessing: false,

  setIsProcessing: (isProcessing) => set(() => ({ isProcessing })),

  inProcessingBoardId: undefined,

  setInProcessingBoardId: (boardId) => set(() => ({ inProcessingBoardId: boardId }))
}))