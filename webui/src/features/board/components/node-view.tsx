import React, { memo, useRef } from "react"
import { Handle, type NodeProps, Position, useConnection, useReactFlow } from "@xyflow/react"
import type { NoteNode } from "../types/flow"
import { RoughRect } from "@/components/rough/rect"
import { NodeLabel } from "./node-label"


/**
 * NodeView component for rendering a resizable node in a graph.
 * It supports aspect ratio locking, resizing from corners, and handles minimum/maximum dimensions.
 */
function NodeView({ id, data, selected }: NodeProps<NoteNode>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isResizingRef = useRef(false)
  const hasResizedRef = useRef(false)
  const aspectRatioRef = useRef<number>(1)

  const { getNode, setNodes, screenToFlowPosition } = useReactFlow()

  const connection = useConnection()

  const isTarget = connection.inProgress && connection.fromNode.id !== id

  const node = getNode(id)

  if (!node) return null

  const { width, height, position } = node

  const resizeHandles = [
    { pos: 'top-left', class: 'top-0 left-0 cursor-nwse-resize' },
    { pos: 'top-right', class: 'top-0 right-0 cursor-nesw-resize' },
    { pos: 'bottom-left', class: 'bottom-0 left-0 cursor-nesw-resize' },
    { pos: 'bottom-right', class: 'bottom-0 right-0 cursor-nwse-resize' },
  ]

  const startResize = (e: MouseEvent | TouchEvent, handle: string) => {
    e.preventDefault?.()
    isResizingRef.current = true
    hasResizedRef.current = true // We are now resizing manually

    const el = containerRef.current
    if (!el) return

    const point = 'touches' in e ? e.touches[0] : e
    const { x: startX, y: startY } = screenToFlowPosition({ x: point.clientX, y: point.clientY })

    const startWidth = el.offsetWidth
    const startHeight = el.offsetHeight
    const startPos = { ...position }

    if (data.lockAspectRatio) {
      aspectRatioRef.current = startWidth / startHeight
    }

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizingRef.current) return

      const point = 'touches' in e ? e.touches[0] : e
      const { x: currentX, y: currentY } = screenToFlowPosition({ x: point.clientX, y: point.clientY })

      const deltaX = currentX - startX
      const deltaY = currentY - startY

      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startPos.x
      let newY = startPos.y

      if (handle.includes('right')) newWidth = startWidth + deltaX
      if (handle.includes('left')) {
        newWidth = startWidth - deltaX
        newX += deltaX
      }
      if (handle.includes('bottom')) newHeight = startHeight + deltaY
      if (handle.includes('top')) {
        newHeight = startHeight - deltaY
        newY += deltaY
      }

      if (data.lockAspectRatio) {
        const ratio = aspectRatioRef.current
        newHeight = newWidth / ratio
      }

      const minW = data.minWidth || 50
      const minH = data.minHeight || 50
      const maxW = Infinity
      const maxH = Infinity

      newWidth = Math.max(minW, Math.min(newWidth, maxW))
      newHeight = Math.max(minH, Math.min(newHeight, maxH))

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                width: newWidth,
                height: newHeight,
                position: { x: newX, y: newY },
              }
            : n
        )
      )
    }

    const onEnd = () => {
      isResizingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove)
    document.addEventListener('touchend', onEnd)
  }

  const handleDown = (handle: string) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startResize(e.nativeEvent, handle)
  }

  const handleClassRight = "w-full h-full !bg-transparent !absolute -inset-[10px] rounded-none -translate-x-[calc(50%-10px)] border-none"
  const handleClassLeft = "w-full h-full !bg-transparent !absolute -inset-[10px] rounded-none translate-x-1/2 border-none"

  const nodeClass = 'relative font-handwriting drag-handle pointer-events-auto bg-transparent' + (hasResizedRef.current ? ' max-w-none' : ' max-w-[400px]')

  return (
    <div className='border-none relative p-2'>
      <div
        className='absolute inset-0 h-full w-full overflow-visible'
      >
        {!connection.inProgress && (
          <Handle
            className={handleClassRight}
            position={Position.Right}
            type="source"
          />
        )}
        {(!connection.inProgress || isTarget) && (
          <Handle
            className={handleClassLeft}
            position={Position.Left}
            type="target"
            isConnectableStart={false}
          />
        )}
      </div>
      <RoughRect
        rounded="rounded-2xl"
        roughness={data.style.roughness}
        fill={data.style.backgroundColor || 'white'}
        fillStyle={data.style.fillStyle}
      >
        <div
          ref={containerRef}
          style={{ width, height }}
          className={nodeClass}
        >
          <NodeLabel note={data} />
          {selected && (
            <div className="absolute -inset-1 border border-blue-500 pointer-events-none rounded z-10" />
          )}
        </div>
      </RoughRect>
      {/* Resize Handles */}
      {selected &&
        resizeHandles.map(({ pos, class: posClass }) => (
          <div
            key={pos}
            onMouseDown={handleDown(pos)}
            onTouchStart={handleDown(pos)}
            className={`absolute w-3 h-3 bg-white border border-blue-500 rounded-full ${posClass} z-20`}
            style={{
              transform: `translate(${pos.includes('right') ? '50%' : '-50%'}, ${
                pos.includes('bottom') ? '50%' : '-50%'
              })`,
            }}
          />
        ))
      }
    </div>
  )
}

export default memo(NodeView)