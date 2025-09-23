import { create } from "zustand/react"


/**
 * AppStore for managing application-wide state.
 */
export interface AppStore {
  userId: string
  userEmail: string
  setUserId: (userId: string) => void
  setUserEmail: (email: string) => void
}


/**
 * Create a Zustand store for managing application-wide state.
 */
export const useAppStore = create<AppStore>((set) => ({
  userId: "root",

  userEmail: "root@localhost",

  setUserId: (userId) => set({ userId }),

  setUserEmail: (userEmail) => set({ userEmail }),
}))