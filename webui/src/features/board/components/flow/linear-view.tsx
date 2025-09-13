import { useMemo, useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Grip } from 'lucide-react'
import { useGraphStore } from '../../store/graph-store'
import type { NoteNode } from '../../types/flow'
import { LinearNoteCard } from './linear-note-card'
import { useUpdateNote } from '../../api/update-note'
import type { NumberProperty } from '../../types/property'
import { useAppStore } from '@/store'
import { ScrollArea } from '@/components/ui/scroll-area'

export type LinearViewProps = {
  cols?: number            // desired columns for >= breakpoint
  gapPx?: number           // grid gap in px
  mobileBreakpointPx?: number // < this width → 1 column (default 640 = Tailwind 'sm')
  maxWidthPx?: number      // container max width
}

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

// snaps to 1 column on small screens using matchMedia
function useEffectiveCols(cols: number, breakpointPx: number) {
  const get = () => {
    if (typeof window === 'undefined') return cols
    return window.innerWidth < breakpointPx ? 1 : cols
  }
  const [effective, setEffective] = useState<number>(get)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 0.5}px)`)
    const update = () => setEffective(mq.matches ? 1 : cols)
    update()
    if (mq.addEventListener) mq.addEventListener('change', update)
    else mq.addListener(update)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update)
      else mq.removeListener(update)
    }
  }, [cols, breakpointPx])

  return effective
}

export function LinearView({
  cols = 3,
  gapPx = 16,
  mobileBreakpointPx = 640,
  maxWidthPx = 1000
}: LinearViewProps) {
  const userId = useAppStore(state => state.userId)
  const nodes = useGraphStore(state => state.nodes)
  const setNodes = useGraphStore(state => state.setNodes)
  const boardId = useGraphStore(state => state.boardId)
  const { updateNote } = useUpdateNote()

  const sortedNodes = useSortedNodes(
    (nodes as NoteNode[]).filter(n => n.data?.style?.type === 'sheet')
  )
  const ids = useMemo(() => sortedNodes.map(n => n.id), [sortedNodes])

  const effectiveCols = useEffectiveCols(cols, mobileBreakpointPx)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
      newOrderValue = (prev.data.properties.listOrder.number + next.data.properties.listOrder.number) / 2
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
              number: newOrderValue
            } as NumberProperty
          }
        }
      }
      updateNote({ boardId, userId, noteId: n.id, noteData: newNode.data })
      return newNode
    })

    setNodes(updatedNodes)
  }

  return (
    <div className='w-full h-full'>
      <ScrollArea className='w-full h-full'>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div
              className='grid px-4 pt-20 pb-20 mx-auto'
              style={{
                maxWidth: maxWidthPx,
                columnGap: gapPx,
                rowGap: gapPx,
                gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`
              }}
            >
              {sortedNodes.map(n => (
                <SortableNoteCard key={n.id} node={n} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </div>
  )
}

type SortableNoteCardProps = {
  node: NoteNode
}

function SortableNoteCard({ node }: SortableNoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: node.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
    opacity: isDragging ? 0.7 : 1,
    minWidth: 0
  }

  return (
    <div ref={setNodeRef} style={style} className='relative'>
      <button
        {...attributes}
        {...listeners}
        aria-label='Drag to reorder'
        className='absolute left-1 top-1 z-20 p-1 rounded-md cursor-grab active:cursor-grabbing touch-none text-muted-foreground/30 hover:text-muted-foreground transition'
        onClick={e => e.preventDefault()}
      >
        <Grip className='size-4' />
      </button>

      <LinearNoteCard node={node} />
    </div>
  )
}