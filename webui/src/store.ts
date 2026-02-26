import { create } from "zustand/react"
import type { BillingPlan } from "@/lib/decode-jwt"


/**
 * AppStore for managing application-wide state.
 */
export interface AppStore {
  userId: string
  userEmail: string
  userPlan: BillingPlan
  setUserId: (userId: string) => void
  setUserEmail: (email: string) => void
  setUserPlan: (plan: BillingPlan) => void
}


/**
 * Create a Zustand store for managing application-wide state.
 */
export const useAppStore = create<AppStore>((set) => ({
  userId: "root",

  userEmail: "root@localhost",

  userPlan: "free",

  setUserId: (userId) => set({ userId }),

  setUserEmail: (userEmail) => set({ userEmail }),

  setUserPlan: (userPlan) => set({ userPlan }),
}))
