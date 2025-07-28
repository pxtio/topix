import { create } from "zustand/react"


/**
 * AppStore for managing application-wide state.
 */
export interface AppStore {
  userId: string
  setUserId: (userId: string) => void
}


/**
 * Create a Zustand store for managing application-wide state.
 */
export const useAppStore = create<AppStore>((set) => ({
  userId: "root",
  setUserId: (userId) => set({ userId })
}))