import { create } from "zustand"

export interface BoardStore {
  currentBoardId?: string
  setCurrentBoardId: (boardId?: string) => void
}


export const useBoardStore = create<BoardStore>((set) => ({
  currentBoardId: undefined,

  setCurrentBoardId: (boardId?: string) => set(() => ({ currentBoardId: boardId }))
}))