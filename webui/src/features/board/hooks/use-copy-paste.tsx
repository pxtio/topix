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

  // clipboard: notes + point nodes + edges that connect those nodes
  const copiedNotesRef = useRef<Note[] | null>(null)
  const copiedPointNodesRef = useRef<NoteNode[] | null>(null)
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
      copiedPointNodesRef.current = null
      copiedEdgesRef.current = null
      return
    }

    const selectedIds = new Set(selectedNodes.map(n => n.id))
    const selectedEdges = edges.filter(e => e.selected)
    if (selectedEdges.length > 0) {
      for (const edge of selectedEdges) {
        selectedIds.add(edge.source)
        selectedIds.add(edge.target)
      }
    }

    const selectedWithEdges = nodes.filter(n => selectedIds.has(n.id)) as NoteNode[]

    const notes = selectedWithEdges
      .map(n => (n.data?.note ?? n.data) as Note | undefined)
      .filter((v): v is Note => v?.type === 'note')

    const pointNodes = selectedWithEdges.filter(
      n => (n.data as { kind?: string }).kind === 'point'
    )

    if (!notes.length && !pointNodes.length) {
      copiedNotesRef.current = null
      copiedPointNodesRef.current = null
      copiedEdgesRef.current = null
      return
    }

    // copy edges whose source & target are both in the selected node set
    const connectingEdges = edges.filter(
      e => selectedIds.has(e.source) && selectedIds.has(e.target),
    )

    copiedNotesRef.current = notes
    copiedPointNodesRef.current = pointNodes
    copiedEdgesRef.current = connectingEdges
  }, [getSelectedNoteNodes, edges, nodes])

  /**
   * Returns a cloned note with a shared offset applied
   */
  const cloneNoteWithOffset = useCallback((note: Note, offset: Jitter): Note => {
    const ox = note.properties?.nodePosition?.position?.x ?? 0
    const oy = note.properties?.nodePosition?.position?.y ?? 0
    const nx = ox + offset.dx
    const ny = oy + offset.dy
    const isSlide = note.style?.type === 'slide'
    const slideName = note.properties?.slideName?.text
    const nextSlideName = slideName
      ? slideName.endsWith(' (copy)')
        ? slideName
        : `${slideName} (copy)`
      : undefined

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
        ...(isSlide && nextSlideName
          ? {
              slideName: {
                ...(note.properties.slideName ?? { type: 'text' }),
                type: 'text',
                text: nextSlideName,
              },
            }
          : {}),
      },
    }

    return cloned
  }, [])

  const computeSelectionCenter = useCallback((notes: Note[], pointNodes: NoteNode[]) => {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const note of notes) {
      const pos = note.properties?.nodePosition?.position
      if (!pos) continue
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x)
      maxY = Math.max(maxY, pos.y)
    }

    for (const node of pointNodes) {
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x)
      maxY = Math.max(maxY, node.position.y)
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null
    }

    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  }, [])

  /**
   * Pastes the copied notes + edges as new nodes/edges,
   * applying a single shared jitter for the whole batch.
   */
  const pasteCopied = useCallback(async () => {
    if (!boardId || !userId) return
    const copiedNotes = copiedNotesRef.current
    const copiedPointNodes = copiedPointNodesRef.current
    const copiedEdges = copiedEdgesRef.current

    if ((!copiedNotes || !copiedNotes.length) && (!copiedPointNodes || !copiedPointNodes.length)) return

    const lastCursor = useGraphStore.getState().lastCursorPosition
    const selectionCenter = computeSelectionCenter(copiedNotes ?? [], copiedPointNodes ?? [])
    const baseOffset = lastCursor && selectionCenter
      ? { dx: lastCursor.x - selectionCenter.x, dy: lastCursor.y - selectionCenter.y }
      : { dx: 0, dy: 0 }

    // one shared jitter per paste to preserve the internal structure
    const jitter = { dx: randJitter(), dy: randJitter() }
    const pasteOffset = { dx: jitter.dx + baseOffset.dx, dy: jitter.dy + baseOffset.dy }

    // clone notes with offset
    const clonedNotes = (copiedNotes ?? []).map(note => cloneNoteWithOffset(note, pasteOffset))

    // build node id mapping: original note id -> cloned note id
    const idMap = new Map<string, string>()
    copiedNotes?.forEach((orig, idx) => {
      const clone = clonedNotes[idx]
      idMap.set(orig.id, clone.id)
    })

    const pointNodes = copiedPointNodes ?? []

    // convert cloned notes to nodes
    const maxZ = nodes.reduce((acc, n) => {
      const kind = (n.data as { kind?: string }).kind
      const nodeType = (n.data as { style?: { type?: string } }).style?.type
      if (kind === 'point' || nodeType === 'slide') return acc
      return Math.max(acc, n.zIndex ?? 0)
    }, 0)
    let zCursor = maxZ + 1

    const newNodes = clonedNotes
      .map(convertNoteToNode)
      .map(n => ({
        ...n,
        selected: true,
        zIndex: (n.data as { style?: { type?: string } }).style?.type === 'slide' ? -1000 : zCursor++
      }))

    const edgePlans = (copiedEdges ?? []).map(edge => {
      const sourceNode = pointNodes.find(n => n.id === edge.source)
      const targetNode = pointNodes.find(n => n.id === edge.target)
      const isLine = !!sourceNode && !!targetNode
      const newId = generateUuid()
      if (isLine) {
        idMap.set(edge.source, `${newId}-start`)
        idMap.set(edge.target, `${newId}-end`)
      }
      return { edge, sourceNode, targetNode, isLine, newId }
    })

    for (const node of pointNodes) {
      if (!idMap.has(node.id)) {
        idMap.set(node.id, generateUuid())
      }
    }

    const clonedPointNodes: NoteNode[] = pointNodes.map((node) => {
      const newId = idMap.get(node.id)
      if (!newId) return node
      return {
        ...node,
        id: newId,
        zIndex: 1001,
        position: {
          x: node.position.x + pasteOffset.dx,
          y: node.position.y + pasteOffset.dy,
        },
        selected: true,
        data: {
          ...node.data,
          endpointActive: true,
        },
      }
    })

    const newEdges: LinkEdge[] = []
    for (const { edge, sourceNode, targetNode, isLine, newId } of edgePlans) {
      const newSource = idMap.get(edge.source)
      const newTarget = idMap.get(edge.target)
      if (!newSource || !newTarget) continue

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

      const finalLinkData = newLink ?? (edge.data as Link | undefined)
      const sanitizedLink = finalLinkData
        ? {
            ...finalLinkData,
            properties: {
              ...finalLinkData.properties,
              edgeControlPoint: { type: 'position' as const },
              ...(isLine
                ? {
                    startPoint: {
                      type: 'position' as const,
                      position: {
                        x: (sourceNode?.position.x ?? 0) + pasteOffset.dx,
                        y: (sourceNode?.position.y ?? 0) + pasteOffset.dy,
                      },
                    },
                    endPoint: {
                      type: 'position' as const,
                      position: {
                        x: (targetNode?.position.x ?? 0) + pasteOffset.dx,
                        y: (targetNode?.position.y ?? 0) + pasteOffset.dy,
                      },
                    },
                  }
                : {}),
            },
          }
        : undefined

      newEdges.push({
        ...edge,
        id: newId,
        source: newSource,
        target: newTarget,
        selected: true,
        data: sanitizedLink,
      })
    }

    // update nodes (persisted): clear selection then append new nodes
    setNodesPersist(curr => {
      const cleared = curr.map(n => ({ ...n, selected: false }))
      return [...cleared, ...newNodes, ...clonedPointNodes]
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
    cloneNoteWithOffset,
    computeSelectionCenter,
    setNodesPersist,
    setEdgesPersist,
    nodes
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
