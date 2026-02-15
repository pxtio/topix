import { memo, useEffect, useState } from 'react'
import {
  type ControlPosition,
  type NodeProps,
  NodeResizeControl,
} from '@xyflow/react'
import type { NoteNode } from '../../types/flow'
import { NodeCard } from './note-card'
import { useGraphStore } from '../../store/graph-store'
import clsx from 'clsx'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { useContentMinHeight } from '../../hooks/use-content-min-height'
import { ShapeChrome } from './shape-chrome'
import { getShapeContentScale } from '../../utils/shape-content-scale'
import { Grip } from 'lucide-react'

const CONNECTOR_GAP = 0
type ResizeHandle = {
  pos: ControlPosition
  className: string
}

const RESIZE_HANDLES: ResizeHandle[] = [
  { pos: 'top-left', className: 'top-0 left-0 cursor-nwse-resize' },
  { pos: 'top-right', className: 'top-0 right-0 cursor-nesw-resize' },
  { pos: 'bottom-left', className: 'bottom-0 left-0 cursor-nesw-resize' },
  { pos: 'bottom-right', className: 'bottom-0 right-0 cursor-nwse-resize' },
]

const getHandleTransform = (pos: ControlPosition) => {
  const x = pos.includes('right') ? '50%' : '-50%'
  const y = pos.includes('bottom') ? '50%' : '-50%'
  return `translate(${x}, ${y})`
}

type ResizeHandlesProps = {
  selected: boolean
  minHeight: number
  minWidth: number
  keepAspectRatio?: boolean
  onResizeStart: () => void
  onResizeEnd: () => void
}

const ResizeHandles = memo(function ResizeHandles({
  selected,
  minHeight,
  minWidth,
  keepAspectRatio = false,
  onResizeStart,
  onResizeEnd,
}: ResizeHandlesProps) {
  if (!selected) return null

  return RESIZE_HANDLES.map(({ pos, className }) => (
    <NodeResizeControl
      key={pos}
      position={pos}
      onResizeStart={onResizeStart}
      onResizeEnd={onResizeEnd}
      minHeight={minHeight}
      minWidth={minWidth}
      keepAspectRatio={keepAspectRatio}
    >
      <div
        className={`absolute w-3 h-3 bg-secondary rounded-full ${className} z-20`}
        style={{ transform: getHandleTransform(pos) }}
      />
    </NodeResizeControl>
  ))
})

type NodeStatusOverlayProps = {
  selected: boolean
  nodeType: NoteNode['data']['style']['type']
  isNew?: boolean
}

const NodeStatusOverlay = memo(function NodeStatusOverlay({
  selected,
  nodeType,
  isNew,
}: NodeStatusOverlayProps) {
  if (selected && nodeType !== 'sheet') {
    return <div className='absolute inset-1 border border-secondary pointer-events-none rounded z-10' />
  }
  if (selected && nodeType === 'sheet') {
    return <div className='absolute inset-0 border-2 border-secondary pointer-events-none rounded z-10 rounded-2xl' />
  }
  if (!selected && isNew) {
    return <div className='absolute inset-0 border-2 border-dashed border-secondary pointer-events-none rounded z-10' />
  }
  return null
})

type SlideFrameProps = {
  slideName: string
}

const SlideFrame = memo(function SlideFrame({ slideName }: SlideFrameProps) {
  return (
    <div className='w-full h-full relative'>
      <div className='absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-medium text-muted-foreground slide-handle cursor-grab active:cursor-grabbing'>
        <span className='inline-flex items-center justify-center w-6 h-6 rounded-md border border-border bg-card shadow-sm'>
          <Grip className='size-3' />
        </span>
        {slideName}
      </div>
      <div className='w-full h-full rounded-lg border-2 border-dashed border-secondary/60 bg-transparent' />
    </div>
  )
})

/**
 * Node view component for rendering a note node in the graph.
 */
function NodeViewBase({ id, data, selected, width, height }: NodeProps<NoteNode>) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [isEditing, setIsEditing] = useState(false)
  const [isResizingLocal, setIsResizingLocal] = useState(false)
  const [resizeGrace, setResizeGrace] = useState(false)

  const setIsResizingNode = useGraphStore(state => state.setIsResizingNode)
  const viewSlides = useGraphStore(state => state.viewSlides)

  const nodeType = data.style.type
  const isVisualNode = nodeType === 'image' || nodeType === 'icon' || nodeType === 'slide'
  const shouldMeasureMinHeight = !isVisualNode && (isEditing || isResizingLocal || resizeGrace)

  // measure content & drive minHeight only while editing or resizing
  const contentScale = getShapeContentScale(nodeType)
  const { contentRef, computedMinH } = useContentMinHeight(id, 0, 20, contentScale, {
    enabled: shouldMeasureMinHeight,
  })

  const persistedHeight = data.properties.nodeSize?.size?.height
  const liveHeight = typeof height === 'number' && Number.isFinite(height) ? height : undefined
  const baseMinH = isVisualNode
    ? 50
    : shouldMeasureMinHeight
    ? computedMinH
    : Math.max(20, liveHeight ?? persistedHeight ?? computedMinH)
  const innerMinH = Math.max(20, baseMinH)

  const isPinned = data.properties.pinned.boolean

  const nodeClass = 'w-full h-full relative font-handwriting drag-handle pointer-events-auto bg-transparent'
  const rounded = data.style.roundness > 0 ? 'rounded-2xl' : 'none'
  const frameClass = clsx('rounded-lg', isPinned && 'ring-2 ring-secondary')

  const backgroundColor = isDark ? darkModeDisplayHex(data.style.backgroundColor) || undefined : data.style.backgroundColor
  const strokeColor = isDark ? darkModeDisplayHex(data.style.strokeColor) || undefined : data.style.strokeColor
  const textColor = isDark ? darkModeDisplayHex(data.style.textColor) || undefined : data.style.textColor

  const handleResizeStart = () => {
    setResizeGrace(false)
    setIsResizingLocal(true)
    setIsResizingNode(true)
  }
  const handleResizeEnd = () => {
    setIsResizingLocal(false)
    setIsResizingNode(false)
    setResizeGrace(true)
  }
  const resizeMinWidth = isVisualNode ? 80 : 20
  const resizeMinHeight = isVisualNode ? 80 : innerMinH

  useEffect(() => {
    if (!resizeGrace) return
    const t = window.setTimeout(() => setResizeGrace(false), 220)
    return () => window.clearTimeout(t)
  }, [resizeGrace])

  if (nodeType === 'slide') {
    if (!viewSlides) return null
    const slideName = (data.properties as { slideName?: { text?: string } } | undefined)?.slideName?.text || 'Slide'

    return (
      <div className='border-none relative bg-transparent overflow-visible w-full h-full p-0'>
        <SlideFrame slideName={slideName} />
        <ResizeHandles
          selected={selected}
          minHeight={innerMinH}
          minWidth={resizeMinWidth}
          keepAspectRatio
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
        />
      </div>
    )
  }

  const content = (
    <div className={nodeClass}>
      <NodeCard
        note={data}
        selected={selected}
        isDark={isDark}
        contentRef={contentRef}
        onLabelEditingChange={setIsEditing}
        nodeWidth={width}
        nodeHeight={height}
      />
      <NodeStatusOverlay selected={selected} nodeType={nodeType} isNew={data.isNew} />
    </div>
  )

  if (nodeType === 'sheet') {
    return (
      <div className='border-none relative p-1 bg-transparent overflow-visible w-full h-full'>
        <ShapeChrome
          type={nodeType}
          minHeight={computedMinH}
          rounded={rounded}
          frameClass={frameClass}
          textColor={textColor}
          backgroundColor={backgroundColor}
          strokeColor={strokeColor}
          roughness={data.style.roughness}
          fillStyle={data.style.fillStyle}
          strokeStyle={data.style.strokeStyle}
          strokeWidth={data.style.strokeWidth}
          seed={data.roughSeed}
        >
          {content}
        </ShapeChrome>
      </div>
    )
  }

  return (
    <div className='border-none relative bg-transparent overflow-visible w-full h-full p-0'>
      <div
        className='absolute inset-0'
        style={{
          top: CONNECTOR_GAP,
          right: CONNECTOR_GAP,
          bottom: CONNECTOR_GAP,
          left: CONNECTOR_GAP,
        }}
      >
        <ShapeChrome
          type={nodeType}
          minHeight={innerMinH}
          rounded={rounded}
          frameClass={frameClass}
          textColor={textColor}
          backgroundColor={backgroundColor}
          strokeColor={strokeColor}
          roughness={data.style.roughness}
          fillStyle={data.style.fillStyle}
          strokeStyle={data.style.strokeStyle}
          strokeWidth={data.style.strokeWidth}
          seed={data.roughSeed}
          className='w-full h-full'
        >
          {content}
        </ShapeChrome>
      </div>

      <ResizeHandles
        selected={selected}
        minHeight={resizeMinHeight}
        minWidth={resizeMinWidth}
        keepAspectRatio={isVisualNode}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  )
}

export const NodeView = memo(NodeViewBase)
