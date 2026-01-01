import type { Viewport } from "@xyflow/react"

const STORAGE_KEY = "topix:graph-viewports"

type StoredViewports = Record<string, Viewport>

const getStorage = () => (typeof window !== "undefined" ? window.localStorage : null)

const safeParse = (raw: string | null): StoredViewports => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as StoredViewports
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export const loadViewportsFromStorage = (): StoredViewports => {
  const storage = getStorage()
  if (!storage) return {}
  return safeParse(storage.getItem(STORAGE_KEY))
}

export const saveViewportToStorage = (boardId: string, viewport: Viewport) => {
  const storage = getStorage()
  if (!storage) return
  const existing = safeParse(storage.getItem(STORAGE_KEY))
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...existing,
      [boardId]: viewport,
    }),
  )
}
