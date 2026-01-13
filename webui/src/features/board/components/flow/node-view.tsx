import { memo, useMemo } from 'react'
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
import { useContentMinHeight } from '../../hooks/content-min-height'
import { ShapeChrome } from './shape-chrome'

const CONNECTOR_GAP = 0

/**
 * Node view component for rendering a note node in the graph.
 */
function NodeView({ id, data, selected }: NodeProps<NoteNode>) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const setIsResizingNode = useGraphStore(state => state.setIsResizingNode)

  // measure content & drive minHeight
  const { contentRef, computedMinH } = useContentMinHeight(
    id,
    24,
    20,
  )

  const baseMinH = data.style.type === 'image' || data.style.type === 'icon' ? 50 : computedMinH
  const innerMinH = Math.max(20, baseMinH)

  const resizeHandles = useMemo(() => ([
    { pos: 'top-left', class: 'top-0 left-0 cursor-nwse-resize' },
    { pos: 'top-right', class: 'top-0 right-0 cursor-nesw-resize' },
    { pos: 'bottom-left', class: 'bottom-0 left-0 cursor-nesw-resize' },
    { pos: 'bottom-right', class: 'bottom-0 right-0 cursor-nwse-resize' },
  ]), [])

  const isPinned = data.properties.pinned.boolean

  const nodeClass = 'w-full h-full relative font-handwriting drag-handle pointer-events-auto bg-transparent'
  const rounded = data.style.roundness > 0 ? 'rounded-2xl' : 'none'
  const frameClass = clsx('rounded-lg', isPinned && 'ring-2 ring-secondary')

  const backgroundColor = isDark ? darkModeDisplayHex(data.style.backgroundColor) || undefined : data.style.backgroundColor
  const strokeColor = isDark ? darkModeDisplayHex(data.style.strokeColor) || undefined : data.style.strokeColor
  const textColor = isDark ? darkModeDisplayHex(data.style.textColor) || undefined : data.style.textColor

  const content = (
    <div className={nodeClass}>
      <NodeCard note={data} selected={selected} isDark={isDark} contentRef={contentRef} />
      {selected && (
        <div className='absolute inset-0 border border-secondary pointer-events-none rounded z-10' />
      )}
      {!selected && data.isNew && (
        <div className='absolute inset-0 border-2 border-dashed border-secondary pointer-events-none rounded z-10' />
      )}
    </div>
  )

  const nodeType = data.style.type

  const handleResizeStart = () => setIsResizingNode(true)
  const handleResizeEnd = () => setIsResizingNode(false)

  const isVisualNode = nodeType === 'image' || nodeType === 'icon'
  const resizeMinWidth = isVisualNode ? 80 : 20
  const resizeMinHeight = isVisualNode ? 80 : innerMinH

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

      {
        selected &&
        resizeHandles.map(
          ({ pos, class: posClass }) => (
            <NodeResizeControl
              key={pos}
              position={pos as ControlPosition}
              onResizeStart={handleResizeStart}
              onResizeEnd={handleResizeEnd}
              minHeight={resizeMinHeight}
              minWidth={resizeMinWidth}
              keepAspectRatio={isVisualNode}
            >
              <div
                className={`absolute w-3 h-3 bg-transparent border border-secondary rounded-full ${posClass} z-20`}
                style={{ transform: `translate(${pos.includes('right') ? '50%' : '-50%'}, ${pos.includes('bottom') ? '50%' : '-50%'})` }}
              />
            </NodeResizeControl>
          )
        )
      }
    </div>
  )
}

export default memo(NodeView)
