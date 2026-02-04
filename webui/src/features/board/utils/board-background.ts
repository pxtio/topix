import { toBaseHex } from "../lib/colors/tailwind"

const BOARD_BG_PREFIX = "board-bg:"

export const DEFAULT_BOARD_BG = ""

export const getBoardBackground = (boardId?: string): string | null => {
  if (!boardId) return null
  try {
    const raw = localStorage.getItem(`${BOARD_BG_PREFIX}${boardId}`)
    if (!raw) return null
    return raw
  } catch {
    return null
  }
}

export const setBoardBackground = (boardId: string | undefined, color: string) => {
  if (!boardId) return
  try {
    localStorage.setItem(`${BOARD_BG_PREFIX}${boardId}`, color)
  } catch {
    // ignore storage failures
  }
}

export const clearBoardBackground = (boardId: string | undefined) => {
  if (!boardId) return
  try {
    localStorage.removeItem(`${BOARD_BG_PREFIX}${boardId}`)
  } catch {
    // ignore storage failures
  }
}

export const applyBackgroundAlpha = (color?: string | null, alpha = 0.5) => {
  if (!color) return null
  const base = toBaseHex(color)
  if (!base) return color
  const r = parseInt(base.slice(1, 3), 16)
  const g = parseInt(base.slice(3, 5), 16)
  const b = parseInt(base.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
