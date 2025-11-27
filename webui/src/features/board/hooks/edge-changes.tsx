import { useCallback, useEffect, useRef } from 'react'
import type { EdgeChange } from '@xyflow/react'
import { useAppStore } from '@/store'
import { useGraphStore } from '../store/graph-store'
import { useUpdateLink } from '../api/update-link'
import type { LinkEdge } from '../types/flow'
import { DEBOUNCE_DELAY } from '../const'

function shouldPersistEdgeChange(ch: EdgeChange<LinkEdge>): boolean {
  switch (ch.type) {
    case 'add':      // created & persisted via onConnect
    case 'remove':   // deletions handled by onEdgesDelete
    case 'select':   // UI-only
      return false
    default:
      return true
  }
}

/**
 * Applies changes to Zustand immediately and debounces DB persistence
 * of the latest eligible edge snapshot per touched id
 */
export function useEdgeChanges() {
  const onEdgesChangeStore = useGraphStore(s => s.onEdgesChange)
  const boardId = useGraphStore(s => s.boardId)
  const userId = useAppStore(s => s.userId)
  const { updateLink } = useUpdateLink()

  const storeRef = useRef(onEdgesChangeStore)
  const boardIdRef = useRef(boardId)
  const userIdRef = useRef(userId)
  useEffect(() => { storeRef.current = onEdgesChangeStore }, [onEdgesChangeStore])
  useEffect(() => { boardIdRef.current = boardId }, [boardId])
  useEffect(() => { userIdRef.current = userId }, [userId])

  const pendingRef = useRef<Map<string, LinkEdge>>(new Map())
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

    for (const edge of entries) {
      if (edge.data) {
        updateLink({ boardId: b, linkId: edge.id, linkData: edge.data })
      }
    }
  }, [updateLink])

  const schedule = useCallback(() => {
    if (timeoutRef.current !== null) return
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      flush()
    }, DEBOUNCE_DELAY) as unknown as number
  }, [flush])

  const handler = useCallback((changes: EdgeChange<LinkEdge>[]) => {
    // always apply to store so UI stays in sync
    storeRef.current(changes)

    // collect only ids that should persist
    const persistIds = new Set<string>()
    for (const ch of changes) {
      const id = ch.type === 'add' ? ch.item.id : ch.id
      if (!id) continue
      if (shouldPersistEdgeChange(ch)) persistIds.add(id)
    }

    if (persistIds.size === 0) return

    // take latest snapshots after store mutation
    const currentEdges = useGraphStore.getState().edges
    for (const id of persistIds) {
      const e = currentEdges.find(ee => ee.id === id)
      if (e) pendingRef.current.set(id, e)
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