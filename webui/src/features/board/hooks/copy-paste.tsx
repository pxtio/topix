import { useCallback, useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useGraphStore } from '../store/graph-store'
import { convertNoteToNode } from '../utils/graph'
import { useAddNotes } from '../api/add-notes'
import { useAppStore } from '@/store'
import type { Note } from '../types/note'
import type { NoteNode } from '../types/flow'

type CopyPasteOptions = {
  /** max absolute jitter in px applied independently to x and y (default 30) */
  jitterMax?: number
  /** enable built-in keybindings: Ctrl/Cmd+C to copy, Ctrl/Cmd+V (and Ctrl/Cmd+B) to paste (default true) */
  shortcuts?: boolean
  /** optional filter to decide which nodes are copyable */
  isCopyableNode?: (node: NoteNode) => boolean
}

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

  const cloneNoteWithJitter = useCallback((note: Note): Note => {
    const ox = note.properties?.nodePosition?.position?.x ?? 0
    const oy = note.properties?.nodePosition?.position?.y ?? 0
    const nx = ox + randJitter()
    const ny = oy + randJitter()

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
  }, [randJitter])

  const pasteCopied = useCallback(async () => {
    if (!boardId || !userId) return
    const copied = copiedRef.current
    if (!copied || !copied.length) return

    const clones = copied.map(cloneNoteWithJitter)
    const newNodes = clones.map(convertNoteToNode).map(n => ({ ...n, selected: true }))

    setNodes(curr => {
      const cleared = curr.map(n => ({ ...n, selected: false }))
      return [...cleared, ...newNodes]
    })

    await addNotes({ boardId, userId, notes: clones })
  }, [boardId, userId, cloneNoteWithJitter, setNodes, addNotes])

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

      // paste: prefer V, also support B if you want it
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
    copySelected,
    pasteCopied,
    hasCopied: () => !!copiedRef.current?.length
  }
}