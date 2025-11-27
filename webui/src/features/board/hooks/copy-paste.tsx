import { useCallback, useEffect, useRef } from 'react'
import { useGraphStore } from '../store/graph-store'
import { convertNoteToNode } from '../utils/graph'
import { useAppStore } from '@/store'
import type { Note } from '../types/note'
import type { NoteNode, LinkEdge } from '../types/flow'
import type { Link } from '../types/link'
import { generateUuid } from '@/lib/common'
import { useShallow } from 'zustand/shallow'

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

  const boardId = useGraphStore(state => state.boardId)
  const nodes = useGraphStore(useShallow(state => state.nodes))
  const edges = useGraphStore(useShallow(state => state.edges))
  const setNodesPersist = useGraphStore(state => state.setNodesPersist)
  const setEdgesPersist = useGraphStore(state => state.setEdgesPersist)

  // clipboard: notes + edges that connect those notes
  const copiedNotesRef = useRef<Note[] | null>(null)
  const copiedEdgesRef = useRef<LinkEdge[] | null>(null)

  const randJitter = useCallback(() => {
    const r = Math.random() * 2 - 1
    return r * jitterMax
  }, [jitterMax])

  const getSelectedNoteNodes = useCallback((): NoteNode[] => {
    const selected = nodes.filter(n => n.selected) as NoteNode[]
    return isCopyableNode ? selected.filter(isCopyableNode) : selected
  }, [nodes, isCopyableNode])

  /**
   * Copies currently selected note nodes + connecting edges into an in-memory buffer
   */
  const copySelected = useCallback(() => {
    const selectedNodes = getSelectedNoteNodes()
    if (!selectedNodes.length) {
      copiedNotesRef.current = null
      copiedEdgesRef.current = null
      return
    }

    const notes = selectedNodes
      .map(n => (n.data?.note ?? n.data) as Note | undefined)
      .filter((v): v is Note => !!v)

    if (!notes.length) {
      copiedNotesRef.current = null
      copiedEdgesRef.current = null
      return
    }

    const selectedIds = new Set(selectedNodes.map(n => n.id))

    // copy edges whose source & target are both in the selected node set
    const connectingEdges = edges.filter(
      e => selectedIds.has(e.source) && selectedIds.has(e.target),
    )

    copiedNotesRef.current = notes
    copiedEdgesRef.current = connectingEdges
  }, [getSelectedNoteNodes, edges])

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
      id: generateUuid(),
      properties: {
        ...note.properties,
        nodePosition: {
          ...(note.properties?.nodePosition ?? { type: 'position' }),
          type: 'position',
          position: { x: nx, y: ny },
        },
      },
    }

    return cloned
  }, [])

  /**
   * Pastes the copied notes + edges as new nodes/edges,
   * applying a single shared jitter for the whole batch.
   */
  const pasteCopied = useCallback(async () => {
    if (!boardId || !userId) return
    const copiedNotes = copiedNotesRef.current
    const copiedEdges = copiedEdgesRef.current

    if (!copiedNotes || !copiedNotes.length) return

    // one shared jitter per paste to preserve the internal structure
    const jitter = { dx: randJitter(), dy: randJitter() }

    // clone notes with jitter
    const clonedNotes = copiedNotes.map(note => cloneNoteWithJitter(note, jitter))

    // build node id mapping: original note id -> cloned note id
    const idMap = new Map<string, string>()
    copiedNotes.forEach((orig, idx) => {
      const clone = clonedNotes[idx]
      idMap.set(orig.id, clone.id)
    })

    // convert cloned notes to nodes
    const newNodes = clonedNotes
      .map(convertNoteToNode)
      .map(n => ({ ...n, selected: true }))

    // clone edges if we have any
    let newEdges: LinkEdge[] = []
    if (copiedEdges && copiedEdges.length > 0) {
      newEdges = copiedEdges
        .map(edge => {
          const newSource = idMap.get(edge.source)
          const newTarget = idMap.get(edge.target)
          if (!newSource || !newTarget) return null

          const newId = generateUuid()
          const oldLink = edge.data as Link | undefined

          const newLink: Link | undefined = oldLink
            ? {
                ...oldLink,
                id: newId,
                source: newSource,
                target: newTarget,
                graphUid: boardId,
                createdAt: new Date().toISOString(),
                updatedAt: undefined,
                deletedAt: undefined,
              }
            : undefined

          const clonedEdge: LinkEdge = {
            ...edge,
            id: newId,
            source: newSource,
            target: newTarget,
            selected: true,
            data: newLink ?? edge.data,
          }

          return clonedEdge
        })
        .filter((e): e is LinkEdge => !!e)
    }

    // update nodes (persisted): clear selection then append new nodes
    setNodesPersist(curr => {
      const cleared = curr.map(n => ({ ...n, selected: false }))
      return [...cleared, ...newNodes]
    })

    // update edges (persisted): clear selection then append new edges
    if (newEdges.length > 0) {
      setEdgesPersist(curr => {
        const cleared = curr.map(e => ({ ...e, selected: false }))
        return [...cleared, ...newEdges]
      })
    }
  }, [
    boardId,
    userId,
    randJitter,
    cloneNoteWithJitter,
    setNodesPersist,
    setEdgesPersist,
  ])

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
     * Copies the currently selected, copyable nodes (and connecting edges) into the buffer
     */
    copySelected,
    /**
     * Pastes buffered nodes + edges as new elements, applying a shared jitter per paste
     */
    pasteCopied,
    /**
     * Returns true if there is anything in the copy buffer
     */
    hasCopied: () =>
      !!copiedNotesRef.current?.length || !!copiedEdgesRef.current?.length,
  }
}