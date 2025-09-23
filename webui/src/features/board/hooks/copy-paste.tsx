/**
 * useCopyPasteNodes
 *
 * A React hook for copy–pasting selected React Flow note-nodes while preserving their relative layout.
 * When multiple nodes are pasted in one operation, a single shared jitter offset (dx, dy) is applied to
 * every cloned node so the pasted group keeps its internal structure intact.
 *
 * Features
 * - Copy currently selected nodes (with optional filter)
 * - Paste clones into the graph with a single shared jitter offset
 * - Optional global keyboard shortcuts: ⌘/Ctrl+C to copy, ⌘/Ctrl+V (and ⌘/Ctrl+B) to paste
 * - Clipboard paste gesture support: any paste event triggers a clone paste (does not read clipboard data)
 *
 * Notes
 * - Uses crypto.randomUUID() to generate new IDs for cloned notes
 * - Only operates when focus is not in an editable element (inputs, textareas, contentEditable)
 */

import { useCallback, useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useGraphStore } from '../store/graph-store'
import { convertNoteToNode } from '../utils/graph'
import { useAddNotes } from '../api/add-notes'
import { useAppStore } from '@/store'
import type { Note } from '../types/note'
import type { NoteNode } from '../types/flow'

type CopyPasteOptions = {
  /**
   * Maximum absolute jitter in pixels applied to both x and y for a paste operation
   * A single shared dx,dy is generated per paste and applied to all pasted nodes
   * @default 30
   */
  jitterMax?: number
  /**
   * Enable built-in keybindings:
   * - Ctrl/Cmd+C to copy
   * - Ctrl/Cmd+V and Ctrl/Cmd+B to paste
   * @default true
   */
  shortcuts?: boolean
  /**
   * Optional filter that decides which selected nodes are copyable
   */
  isCopyableNode?: (node: NoteNode) => boolean
}

type Jitter = { dx: number, dy: number }

export function useCopyPasteNodes(opts: CopyPasteOptions = {}) {
  const { jitterMax = 30, shortcuts = true, isCopyableNode } = opts

  const userId = useAppStore(state => state.userId)
  const { boardId, nodes } = useGraphStore()
  const { setNodes } = useReactFlow()
  const { addNotes } = useAddNotes()

  const copiedRef = useRef<Note[] | null>(null)

  const randJitter = useCallback(() => {
    const r = Math.random() * 2 - 1
    return r * jitterMax
  }, [jitterMax])

  const getSelectedNoteNodes = useCallback((): NoteNode[] => {
    const selected = nodes.filter(n => n.selected) as NoteNode[]
    return isCopyableNode ? selected.filter(isCopyableNode) : selected
  }, [nodes, isCopyableNode])

  /**
   * Copies currently selected note nodes into an in-memory buffer
   */
  const copySelected = useCallback(() => {
    const selected = getSelectedNoteNodes()
    if (!selected.length) {
      copiedRef.current = null
      return
    }

    // support either node.data.note or node.data holding the Note
    const notes = selected
      .map(n => (n.data?.note ?? n.data) as Note | undefined)
      .filter((v): v is Note => !!v)

    if (!notes.length) {
      copiedRef.current = null
      return
    }

    copiedRef.current = notes
  }, [getSelectedNoteNodes])

  /**
   * Returns a cloned note with a shared jitter offset applied
   */
  const cloneNoteWithJitter = useCallback((note: Note, jitter: Jitter): Note => {
    const ox = note.properties?.nodePosition?.position?.x ?? 0
    const oy = note.properties?.nodePosition?.position?.y ?? 0
    const nx = ox + jitter.dx
    const ny = oy + jitter.dy

    const cloned: Note = {
      ...note,
      id: crypto.randomUUID(),
      properties: {
        ...note.properties,
        nodePosition: {
          ...(note.properties?.nodePosition ?? { type: 'position' }),
          type: 'position',
          position: { x: nx, y: ny }
        }
      }
    }

    return cloned
  }, [])

  /**
   * Pastes the copied notes as new nodes, applying a single shared jitter for the whole batch
   */
  const pasteCopied = useCallback(async () => {
    if (!boardId || !userId) return
    const copied = copiedRef.current
    if (!copied || !copied.length) return

    // one shared jitter per paste to preserve the internal structure
    const jitter = { dx: randJitter(), dy: randJitter() }

    const clones = copied.map(note => cloneNoteWithJitter(note, jitter))
    const newNodes = clones.map(convertNoteToNode).map(n => ({ ...n, selected: true }))

    setNodes(curr => {
      const cleared = curr.map(n => ({ ...n, selected: false }))
      return [...cleared, ...newNodes]
    })

    await addNotes({ boardId, userId, notes: clones })
  }, [boardId, userId, randJitter, cloneNoteWithJitter, setNodes, addNotes])

  useEffect(() => {
    if (!shortcuts) return

    const isEditable = () => {
      const el = document.activeElement as HTMLElement | null
      if (!el) return true
      const tag = el.tagName.toLowerCase()
      return !(tag === 'input' || tag === 'textarea' || el.isContentEditable)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isEditable()) return
      const mod = e.metaKey || e.ctrlKey

      // copy
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copySelected()
        return
      }

      // paste: prefer V, also support B
      if (mod && (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'b')) {
        e.preventDefault()
        pasteCopied()
      }
    }

    const onPaste = (e: ClipboardEvent) => {
      if (!isEditable()) return
      // we’re not reading clipboard content; use it as a signal to paste our clones
      e.preventDefault()
      pasteCopied()
    }

    const listenerOptions: AddEventListenerOptions = { capture: true }
    document.addEventListener('keydown', onKeyDown, listenerOptions)
    document.addEventListener('paste', onPaste, listenerOptions)

    return () => {
      document.removeEventListener('keydown', onKeyDown, listenerOptions)
      document.removeEventListener('paste', onPaste, listenerOptions)
    }
  }, [shortcuts, copySelected, pasteCopied])

  return {
    /**
     * Copies the currently selected, copyable nodes into the buffer
     */
    copySelected,
    /**
     * Pastes buffered nodes as new nodes, applying a shared jitter per paste
     */
    pasteCopied,
    /**
     * Returns true if there is anything in the copy buffer
     */
    hasCopied: () => !!copiedRef.current?.length
  }
}