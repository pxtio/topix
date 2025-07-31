import { create } from "zustand/react"


/**
 * AppStore for managing application-wide state.
 */
export interface AppStore {
  userId: string
  view: "chat" | "board"
  setUserId: (userId: string) => void
  setView: (view: "chat" | "board") => void
}


/**
 * Create a Zustand store for managing application-wide state.
 */
export const useAppStore = create<AppStore>((set) => ({
  userId: "root",
  view: "chat",

  setUserId: (userId) => set({ userId }),
  setView: (view) => set({ view })
}))