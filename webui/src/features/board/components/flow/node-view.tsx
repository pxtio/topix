import { memo, useEffect, useMemo } from 'react'
import {
  type ControlPosition,
  Handle,
  type NodeProps,
  NodeResizeControl,
  Position,
} from '@xyflow/react'
import type { NoteNode } from '../../types/flow'
import { NodeCard } from './note-card'
import { useDebouncedCallback } from 'use-debounce'
import { useUpdateNote } from '../../api/update-note'
import { useAppStore } from '@/store'
import { useGraphStore } from '../../store/graph-store'
import { DEBOUNCE_DELAY } from '../../const'
import clsx from 'clsx'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { useContentMinHeight } from '../../hooks/content-min-height'
import { ShapeChrome } from './shape-chrome'


/**
 * Node view component for rendering a note node in the graph.
 */
function NodeView({ id, data, selected }: NodeProps<NoteNode>) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const userId = useAppStore(state => state.userId)
  const boardId = useGraphStore(state => state.boardId)
  const setIsResizingNode = useGraphStore(state => state.setIsResizingNode)
  const { updateNote } = useUpdateNote()

  const debounce = useDebouncedCallback(() => {
    if (boardId && userId) {
      updateNote({ boardId, userId, noteId: id, noteData: data })
    }
  }, DEBOUNCE_DELAY)
  useEffect(() => { debounce() }, [debounce, data])

  // measure content & drive minHeight
  const { contentRef, computedMinH } = useContentMinHeight(id, 24, 100)

  const resizeHandles = useMemo(() => ([
    { pos: 'top-left', class: 'top-0 left-0 cursor-nwse-resize' },
    { pos: 'top-right', class: 'top-0 right-0 cursor-nesw-resize' },
    { pos: 'bottom-left', class: 'bottom-0 left-0 cursor-nesw-resize' },
    { pos: 'bottom-right', class: 'bottom-0 right-0 cursor-nwse-resize' },
  ]), [])

  const isPinned = !!data.properties.pinned.boolean

  const handleClassRight = 'w-full h-full !bg-transparent !absolute -inset-[10px] rounded-none -translate-x-[calc(50%-10px)] border-none'
  const handleClassLeft = 'w-full h-full !bg-transparent !absolute -inset-[10px] rounded-none translate-x-1/2 border-none'

  const nodeClass = 'w-full h-full relative font-handwriting drag-handle pointer-events-auto bg-transparent'
  const rounded = data.style.roundness > 0 ? 'rounded-2xl' : 'none'
  const frameClass = clsx('shadow-lg rounded-md border border-border', isPinned && 'ring-2 ring-primary')

  const backgroundColor = isDark ? darkModeDisplayHex(data.style.backgroundColor) || undefined : data.style.backgroundColor
  const strokeColor = isDark ? darkModeDisplayHex(data.style.strokeColor) || undefined : data.style.strokeColor
  const textColor = isDark ? darkModeDisplayHex(data.style.textColor) || undefined : data.style.textColor

  // content block
  const content = (
    <div className={nodeClass}>
      <NodeCard note={data} selected={selected} isDark={isDark} contentRef={contentRef} />
      {selected && <div className='absolute -inset-1 border border-primary pointer-events-none rounded z-10' />}
    </div>
  )

  const nodeType = data.style.type

  const handleResizeStart = () => setIsResizingNode(true)
  const handleResizeEnd = () => setIsResizingNode(false)

  return (
    <div className='border-none relative p-2 bg-transparent overflow-visible w-full h-full'>
      <div className='absolute inset-0 w-full h-full overflow-visible'>
        <Handle className={handleClassRight} position={Position.Right} type='source' />
        <Handle className={handleClassLeft} position={Position.Left} type='target' isConnectableStart={false} />
      </div>

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

      {nodeType !== 'sheet' && selected && resizeHandles.map(({ pos, class: posClass }) => (
        <NodeResizeControl
          key={pos}
          position={pos as ControlPosition}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          minHeight={computedMinH}
          minWidth={200}
        >
          <div
            className={`absolute w-3 h-3 bg-transparent border border-primary rounded-full ${posClass} z-20`}
            style={{ transform: `translate(${pos.includes('right') ? '50%' : '-50%'}, ${pos.includes('bottom') ? '50%' : '-50%'})` }}
          />
        </NodeResizeControl>
      ))}
    </div>
  )
}

export default memo(NodeView)