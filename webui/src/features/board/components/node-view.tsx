import React, { memo, useEffect, useRef } from "react"
import { Handle, type NodeProps, Position, useReactFlow } from "@xyflow/react"
import type { NoteNode } from "../types/flow"
import { RoughRect } from "@/components/rough/rect"
import { NodeLabel } from "./node-label"
import { useDebouncedCallback } from 'use-debounce'
import { useUpdateNote } from "../api/update-note"
import { useAppStore } from "@/store"
import { useGraphStore } from "../store/graph-store"
import { DEBOUNCE_DELAY } from "../const"

/**
 * NodeView component for rendering a resizable node in a graph.
 * It supports aspect ratio locking, resizing from corners, and handles minimum/maximum dimensions.
 */
function NodeView({ id, data, selected }: NodeProps<NoteNode>) {
  const userId = useAppStore((state) => state.userId)

  const boardId = useGraphStore((state) => state.boardId)

  const containerRef = useRef<HTMLDivElement | null>(null)

  const hasResizedRef = useRef(false)

  const { getNode } = useReactFlow()

  const { updateNote } = useUpdateNote()

  // Debounced function to update the note in the backend
  const debounce = useDebouncedCallback(() => {
    if (boardId && userId) {
      updateNote({
        boardId,
        userId,
        noteId: id,
        noteData: data
      })
    }
  }, DEBOUNCE_DELAY)

  useEffect(() => {
    debounce()
  }, [debounce, data])

  const node = getNode(id)

  if (!node) return null

  const { width, height } = node

  const resizeHandles = [
    { pos: 'top-left', class: 'top-0 left-0 cursor-nwse-resize' },
    { pos: 'top-right', class: 'top-0 right-0 cursor-nesw-resize' },
    { pos: 'bottom-left', class: 'bottom-0 left-0 cursor-nesw-resize' },
    { pos: 'bottom-right', class: 'bottom-0 right-0 cursor-nwse-resize' },
  ]

  const handleDown = (handle: string) => (e: React.MouseEvent | React.TouchEvent) => {
    console.log('handleDown', handle)
    e.preventDefault()
    e.stopPropagation()
  }

  const handleClassRight = "w-full h-full !bg-transparent !absolute -inset-[10px] rounded-none -translate-x-[calc(50%-10px)] border-none"
  const handleClassLeft = "w-full h-full !bg-transparent !absolute -inset-[10px] rounded-none translate-x-1/2 border-none"

  const nodeClass = 'relative font-handwriting drag-handle pointer-events-auto bg-transparent' + (hasResizedRef.current ? ' max-w-none' : ' max-w-[400px]')

  return (
    <div className='border-none relative p-2 bg-transparent overflow-visible'>
      <div
        className='absolute inset-0 h-full w-full overflow-visible'
      >
        <Handle
          className={handleClassRight}
          position={Position.Right}
          type="source"
        />
        <Handle
          className={handleClassLeft}
          position={Position.Left}
          type="target"
          isConnectableStart={false}
        />
      </div>
      <RoughRect
        rounded="rounded-2xl"
        roughness={data.style.roughness}
        fill={data.style.backgroundColor || 'white'}
        fillStyle={data.style.fillStyle}
        stroke={data.style.strokeColor || 'transparent'}
        strokeWidth={data.style.strokeWidth}
      >
        <div
          ref={containerRef}
          style={{ width, height }}
          className={nodeClass}
        >
          <NodeLabel note={data} selected={selected} />
          {selected && (
            <div className="absolute -inset-1 border border-primary pointer-events-none rounded z-10" />
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
            className={`absolute w-3 h-3 bg-transparent border border-primary rounded-full ${posClass} z-20`}
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