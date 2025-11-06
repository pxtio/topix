import { useCallback, useEffect, useRef } from 'react'
import type { NodeChange } from '@xyflow/react'
import { useAppStore } from '@/store'
import { useGraphStore } from '../store/graph-store'
import { useUpdateNote } from '../api/update-note'
import type { NoteNode } from '../types/flow'
import { DEBOUNCE_DELAY } from '../const'

function shouldPersistNodeChange(ch: NodeChange<NoteNode>, isResizing: boolean): boolean {
  switch (ch.type) {
    case 'select':
      return false
    case 'remove':
      // deletions are already handled by onNodesDelete → no double-persist here
      return false
    case 'position':
      // only persist at drag end
      return ch.dragging === false
    case 'dimensions':
      // only persist when resize has finished
      return !isResizing
    // 'add', 'reset', 'replace' and any other updates: persist
    default:
      return true
  }
}

/**
 * Applies changes to Zustand immediately and debounces DB persistence
 * for *only the relevant* node changes
 */
export function useNodeChanges() {
  const onNodesChangeStore = useGraphStore(s => s.onNodesChange)
  const boardId = useGraphStore(s => s.boardId)
  const isResizingNode = useGraphStore(s => s.isResizingNode)
  const userId = useAppStore(s => s.userId)
  const { updateNote } = useUpdateNote()

  const storeRef = useRef(onNodesChangeStore)
  const boardIdRef = useRef(boardId)
  const userIdRef = useRef(userId)
  const isResizingRef = useRef(isResizingNode)
  useEffect(() => { storeRef.current = onNodesChangeStore }, [onNodesChangeStore])
  useEffect(() => { boardIdRef.current = boardId }, [boardId])
  useEffect(() => { userIdRef.current = userId }, [userId])
  useEffect(() => { isResizingRef.current = isResizingNode }, [isResizingNode])

  const pendingRef = useRef<Map<string, NoteNode>>(new Map())
  const timeoutRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const entries = Array.from(pendingRef.current.values())
    pendingRef.current.clear()

    const b = boardIdRef.current
    const u = userIdRef.current
    if (!b || !u || entries.length === 0) return

    for (const node of entries) {
      updateNote({ boardId: b, userId: u, noteId: node.id, noteData: node.data })
    }
  }, [updateNote])

  const schedule = useCallback(() => {
    if (timeoutRef.current !== null) return
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      flush()
    }, DEBOUNCE_DELAY) as unknown as number
  }, [flush])

  const handler = useCallback((changes: NodeChange<NoteNode>[]) => {
    // apply to Zustand immediately
    storeRef.current(changes)

    // collect only ids we actually want to persist, based on filtered change types
    const persistIds = new Set<string>()
    for (const ch of changes) {
      const id = ch.type === 'add' ? ch.item.id : ch.id
      if (!id) continue
      if (shouldPersistNodeChange(ch, isResizingRef.current)) {
        persistIds.add(id)
      }
    }

    if (persistIds.size === 0) return

    // take latest snapshots after store mutation
    const currentNodes = useGraphStore.getState().nodes
    for (const id of persistIds) {
      const n = currentNodes.find(nn => nn.id === id)
      if (n) pendingRef.current.set(id, n)
    }

    schedule()
  }, [schedule])

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      const flushPending = pendingRef
      flushPending.current.clear()
    }
  }, [])

  return handler
}