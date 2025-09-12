import { useMemo } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useGraphStore } from '../../store/graph-store'
import type { NoteNode } from '../../types/flow'
import { LinearNoteCard } from './linear-note-card'
import { useUpdateNote } from '../../api/update-note'
import type { NumberProperty } from '../../types/property'
import { useAppStore } from '@/store'

const COLUMNS = 3 // adjust as you wish

/**
 * Hook to return nodes sorted by their listOrder property.
 */
function useSortedNodes(nodes: NoteNode[]) {
  return useMemo(
    () =>
      [...nodes].sort(
        (a, b) =>
          (a.data.properties.listOrder.number ?? 0) -
          (b.data.properties.listOrder.number ?? 0)
      ),
    [nodes]
  )
}

/**
 * LinearView component to display notes in a sortable grid layout.
 */
export function LinearView() {
  const userId = useAppStore(state => state.userId)
  const nodes = useGraphStore(state => state.nodes)
  const setNodes = useGraphStore(state => state.setNodes)
  const boardId = useGraphStore(state => state.boardId)

  const { updateNote } = useUpdateNote()

  const sortedNodes = useSortedNodes(
    (nodes as NoteNode[]).filter(n => n.data?.style?.type === 'sheet')
  )
  const ids = sortedNodes.map(n => n.id)

  // Partition sorted nodes into columns for grid rendering
  const columns: NoteNode[][] = Array.from({ length: COLUMNS }, () => [])
  sortedNodes.forEach((n, i) => {
    columns[i % COLUMNS].push(n)
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(sortedNodes, oldIndex, newIndex)

    const prev = newOrder[newIndex - 1] ?? null
    const next = newOrder[newIndex + 1] ?? null

    let newOrderValue: number
    if (prev && next) {
      newOrderValue =
        (prev.data.properties.listOrder.number + next.data.properties.listOrder.number) / 2
    } else if (next) {
      newOrderValue = next.data.properties.listOrder.number - 100
    } else if (prev) {
      newOrderValue = prev.data.properties.listOrder.number + 100
    } else {
      newOrderValue = 0
    }
    if (!userId || !boardId) return
    const updatedNodes = nodes.map(n => {
      if (n.id !== active.id) return n
      const newNode = {
        ...n,
        data: {
          ...n.data,
          properties: {
            ...n.data.properties,
            listOrder: {
              type: 'number',
              number: newOrderValue,
            } as NumberProperty,
          },
        }
      }
      updateNote({ boardId, userId, noteId: n.id, noteData: newNode.data })
      return newNode
    })
    setNodes(updatedNodes)
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div
          className={`grid grid-cols-${COLUMNS} gap-4 px-4 pt-20 pb-20 mx-auto max-w-[800px]`}
        >
          {columns.map((col, cIdx) => (
            <div key={cIdx} className="flex flex-col gap-4">
              {col.map(n => (
                <SortableNoteCard key={n.id} node={n} />
              ))}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

type SortableNoteCardProps = {
  node: NoteNode
}

/**
 * A sortable wrapper around LinearNoteCard.
 */
function SortableNoteCard({ node }: SortableNoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LinearNoteCard node={node} />
    </div>
  )
}