import { create } from 'zustand'

export type PendingNewsfeed = {
  id: string
  createdAt: string
}

type PendingMap = Record<string, PendingNewsfeed[]>

type NewsfeedsStore = {
  pending: PendingMap
  // set: replace pending list for a subscription
  setPending: (subId: string, items: PendingNewsfeed[]) => void
  // add: push one pending id
  addPending: (subId: string, id: string, createdAt?: string) => void
  // remove: drop one pending id
  removePending: (subId: string, id: string) => void
  // reset all
  listPendings: (subId: string) => PendingNewsfeed[]
  reset: () => void
}

export const useNewsfeedsStore = create<NewsfeedsStore>((set, get) => ({
  pending: {},

  setPending: (subId, items) =>
    set(state => ({
      pending: { ...state.pending, [subId]: items }
    })),

  addPending: (subId, id, createdAt) =>
    set(state => {
      const list = state.pending[subId] ?? []
      // avoid dupes
      if (list.some(p => p.id === id)) return state
      const next = [...list, { id, createdAt: createdAt ?? new Date().toISOString() }]
      return { pending: { ...state.pending, [subId]: next } }
    }),

  removePending: (subId, id) =>
    set(state => {
      const list = state.pending[subId]
      if (!list) return state
      const next = list.filter(p => p.id !== id)
      const pending = { ...state.pending }
      if (next.length) pending[subId] = next
      else delete pending[subId]
      return { pending }
    }),

  listPendings: subId => {
    return get().pending[subId] ?? []
  },

  reset: () => set({ pending: {} })
}))