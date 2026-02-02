import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Grip, Presentation } from 'lucide-react'
import { useGraphStore } from '../../store/graph-store'
import type { NoteNode } from '../../types/flow'
import { useAddNoteNode } from '../../hooks/use-add-node'
import { useUpdateNote } from '../../api/update-note'
import type { NumberProperty, TextProperty } from '@/features/newsfeed/types/properties'
import { useReactFlow } from '@xyflow/react'
import clsx from 'clsx'

type SlidePanelProps = {
  onClose?: () => void
}

const getSlideName = (node: NoteNode) =>
  (node.data.properties as { slideName?: TextProperty | undefined } | undefined)?.slideName?.text || 'Slide'

const getSlideNumber = (node: NoteNode) =>
  (node.data.properties as { slideNumber?: NumberProperty | undefined } | undefined)?.slideNumber?.number ?? 0

export function SlidePanel({ onClose }: SlidePanelProps) {
  const nodes = useGraphStore(state => state.nodes)
  const setNodes = useGraphStore(state => state.setNodes)
  const boardId = useGraphStore(state => state.boardId)
  const setPresentationMode = useGraphStore(state => state.setPresentationMode)
  const setActiveSlideId = useGraphStore(state => state.setActiveSlideId)
  const addNoteNode = useAddNoteNode()
  const { updateNote } = useUpdateNote()
  const { fitView } = useReactFlow()

  const slides = useMemo(
    () => (nodes as NoteNode[])
      .filter(n => n.data?.style?.type === 'slide')
      .sort((a, b) => getSlideNumber(a) - getSlideNumber(b)),
    [nodes]
  )

  const ids = useMemo(() => slides.map(n => n.id), [slides])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(slides, oldIndex, newIndex)

    if (!boardId) return

    const updated = nodes.map(n => {
      const idx = newOrder.findIndex(s => s.id === n.id)
      if (idx === -1) return n
      const nextNumber = idx + 1
      const nextName = getSlideName(n) || `Slide ${nextNumber}`
      const nextNode = {
        ...n,
        data: {
          ...n.data,
          properties: {
            ...n.data.properties,
            slideNumber: { type: 'number', number: nextNumber } as NumberProperty,
            slideName: { type: 'text', text: nextName } as TextProperty,
          }
        }
      }
      updateNote({ boardId, noteId: n.id, noteData: nextNode.data })
      return nextNode
    })

    setNodes(updated)
  }

  const handlePresent = async () => {
    if (slides.length === 0) return
    const node = slides[0]
    setPresentationMode(true)
    setActiveSlideId(node.id)
    await fitView({ nodes: [node], padding: 0.2, duration: 300 })
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 bg-sidebar">
        <div className="text-sm font-medium">Slides</div>
        <div className="flex items-center gap-2">
          <button className={panelButtonClass} onClick={() => addNoteNode({ nodeType: 'slide' })}>
            Add Slide
          </button>
          <button className={panelButtonClass} onClick={handlePresent}>
            <Presentation className="size-4 mr-1 inline-block" />
            Present
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="p-3 flex flex-col gap-2">
              {slides.map(slide => (
                <SortableSlideRow key={slide.id} node={slide} />
              ))}
              {slides.length === 0 && (
                <div className="text-sm text-muted-foreground px-2 py-6">
                  No slides yet. Click “Add Slide” to create one.
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

type SortableSlideRowProps = {
  node: NoteNode
}

function SortableSlideRow({ node }: SortableSlideRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2",
        "transition-colors hover:bg-sidebar-primary/30"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="p-1 rounded-md cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition"
        onClick={e => e.preventDefault()}
      >
        <Grip className="size-4" />
      </button>
      <div className="text-sm">{getSlideName(node)}</div>
    </div>
  )
}
  const panelButtonClass = `
    transition-colors
    text-card-foreground
    hover:bg-sidebar-primary hover:text-sidebar-primary-foreground
    px-3 py-1.5 rounded-lg
    text-xs font-medium
    border border-border
  `
