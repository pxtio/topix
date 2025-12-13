import { memo, useMemo } from 'react'
import {
  type ControlPosition,
  Handle,
  type NodeProps,
  NodeResizeControl,
  Position,
} from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { NoteNode } from '../../types/flow'
import { NodeCard } from './note-card'
import { useGraphStore } from '../../store/graph-store'
import clsx from 'clsx'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { useContentMinHeight } from '../../hooks/content-min-height'
import { ShapeChrome } from './shape-chrome'

const CONNECTOR_GAP = 10

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
    24 + CONNECTOR_GAP * 2,
    24 + CONNECTOR_GAP * 2,
  )

  const baseMinH = data.style.type === 'image' || data.style.type === 'icon' ? 50 : computedMinH
  const innerMinH = Math.max(30, baseMinH - CONNECTOR_GAP * 2)

  const resizeHandles = useMemo(() => ([
    { pos: 'top-left', class: 'top-0 left-0 cursor-nwse-resize' },
    { pos: 'top-right', class: 'top-0 right-0 cursor-nesw-resize' },
    { pos: 'bottom-left', class: 'bottom-0 left-0 cursor-nesw-resize' },
    { pos: 'bottom-right', class: 'bottom-0 right-0 cursor-nwse-resize' },
  ]), [])

  const handleSegments = useMemo(() => {
    const connector = CONNECTOR_GAP
    const shared = {
      className: 'bg-transparent border-none',
    }
    return [
      {
        key: 'top',
        position: Position.Top,
        type: 'target' as const,
        isConnectableStart: false,
        style: {
          left: connector,
          right: connector,
          height: connector,
          top: 0,
          transform: 'translateY(-50%)',
          cursor: 'crosshair',
          opacity: 0,
        } as CSSProperties,
        ...shared,
      },
      {
        key: 'bottom',
        position: Position.Bottom,
        type: 'source' as const,
        isConnectableStart: true,
        style: {
          left: connector,
          right: connector,
          height: connector,
          bottom: 0,
          transform: 'translateY(50%)',
          cursor: 'crosshair',
          opacity: 0,
        } as CSSProperties,
        ...shared,
      },
      {
        key: 'left',
        position: Position.Left,
        type: 'target' as const,
        isConnectableStart: false,
        style: {
          top: connector,
          bottom: connector,
          width: connector,
          left: 0,
          transform: 'translateX(-50%)',
          cursor: 'crosshair',
          opacity: 0,
        } as CSSProperties,
        ...shared,
      },
      {
        key: 'right',
        position: Position.Right,
        type: 'source' as const,
        isConnectableStart: true,
        style: {
          top: connector,
          bottom: connector,
          width: connector,
          right: 0,
          transform: 'translateX(50%)',
          cursor: 'crosshair',
          opacity: 0,
        } as CSSProperties,
        ...shared,
      },
    ]
  }, [])

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
        <div className='absolute -inset-1 border border-secondary pointer-events-none rounded z-10' />
      )}
      {!selected && data.isNew && (
        <div className='absolute -inset-1 border-2 border-dashed border-secondary pointer-events-none rounded z-10' />
      )}
    </div>
  )

  const nodeType = data.style.type

  const handleResizeStart = () => setIsResizingNode(true)
  const handleResizeEnd = () => setIsResizingNode(false)

  const isVisualNode = nodeType === 'image' || nodeType === 'icon'
  const resizeMinWidth = isVisualNode ? 80 : 200
  const resizeMinHeight = isVisualNode ? 80 : innerMinH

  return (
    <div className='border-none relative bg-transparent overflow-visible w-full h-full'>
      {handleSegments.map(seg => (
        <Handle
          key={seg.key}
          className={seg.className}
          position={seg.position}
          type={seg.type}
          style={seg.style}
          isConnectableStart={seg.isConnectableStart}
        />
      ))}

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

      {nodeType !== 'sheet' && selected && resizeHandles.map(({ pos, class: posClass }) => (
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
      ))}
    </div>
  )
}

export default memo(NodeView)
