import { useCallback, useEffect, useRef } from 'react'
import type { NodeChange } from '@xyflow/react'
import { useAppStore } from '@/store'
import { useGraphStore } from '../store/graph-store'
import { useUpdateNote } from '../api/update-note'
import { useRemoveNote } from '../api/remove-note'
import type { NoteNode } from '../types/flow'
import { DEBOUNCE_DELAY } from '../const'

function shouldPersistNodeChange(ch: NodeChange<NoteNode>, isResizing: boolean): boolean {
  switch (ch.type) {
    case 'select':
      return false
    case 'remove':
      // removal is handled explicitly (immediate delete)
      return false
    case 'position':
      return ch.dragging === false
    case 'dimensions':
      return !isResizing
    default:
      return true
  }
}

/**
 * Applies changes to Zustand immediately, persists:
 * - updates: debounced (updateNote)
 * - deletes: immediate (removeNote), including bulk setNodes (reset/replace) diffs
 */
export function useNodeChanges() {
  const onNodesChangeStore = useGraphStore(s => s.onNodesChange)
  const isResizingNode = useGraphStore(s => s.isResizingNode)
  const boardId = useGraphStore(s => s.boardId)
  const userId = useAppStore(s => s.userId)

  const { updateNote } = useUpdateNote()
  const { removeNote } = useRemoveNote()

  // pending updates (non-deletes) and debounce timer
  const pendingRef = useRef<Map<string, NoteNode>>(new Map())
  const timeoutRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const entries = Array.from(pendingRef.current.values())
    pendingRef.current.clear()

    if (!boardId || !userId || entries.length === 0) return

    for (const node of entries) {
      updateNote({ boardId, userId, noteId: node.id, noteData: node.data })
    }
  }, [boardId, userId, updateNote])

  const schedule = useCallback(() => {
    if (timeoutRef.current !== null) return
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      flush()
    }, DEBOUNCE_DELAY) as unknown as number
  }, [flush])

  const handler = useCallback((changes: NodeChange<NoteNode>[]) => {
    // 1) take a snapshot BEFORE applying changes
    const prevNodes = useGraphStore.getState().nodes
    const prevIds = new Set(prevNodes.map(n => n.id))

    // 2) apply to Zustand (this is the single source of truth)
    onNodesChangeStore(changes)

    // 3) AFTER applying, get the new snapshot
    const nextNodes = useGraphStore.getState().nodes
    const nextById = new Map(nextNodes.map(n => [n.id, n]))

    // 4) figure out deletes:
    //    - explicit remove change types
    //    - implicit deletes caused by bulk setNodes/reset/replace (prev - next diff)
    const explicitRemovedIds = new Set<string>(
      changes
        .filter(ch => ch.type === 'remove')
        .map(ch => ch.id)
        .filter((id): id is string => !!id)
    )

    const diffRemovedIds = new Set<string>()
    for (const id of prevIds) {
      if (!nextById.has(id)) diffRemovedIds.add(id)
    }

    // union
    const removedIds = new Set<string>([...explicitRemovedIds, ...diffRemovedIds])

    // 5) persist deletes immediately
    if (removedIds.size > 0 && boardId && userId) {
      for (const id of removedIds) {
        removeNote({ boardId, userId, noteId: id })
      }
    }

    // 6) collect updates we should persist (filtered) and debounce them
    const persistIds = new Set<string>()
    for (const ch of changes) {
      const id = ch.type === 'add' ? ch.item.id : ch.id
      if (!id) continue
      if (removedIds.has(id)) continue
      if (shouldPersistNodeChange(ch, isResizingNode)) {
        persistIds.add(id)
      }
    }

    if (persistIds.size === 0) return

    for (const id of persistIds) {
      const n = nextById.get(id)
      if (n) pendingRef.current.set(id, n)
    }

    schedule()
  }, [onNodesChangeStore, isResizingNode, boardId, userId, removeNote, schedule])

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      const ref = pendingRef
      ref.current.clear()
    }
  }, [])

  return handler
}