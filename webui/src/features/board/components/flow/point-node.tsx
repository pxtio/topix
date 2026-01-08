import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import clsx from 'clsx'
import type { NoteNode } from '../../types/flow'


/**
 * Component representing a point node in the flow board.
 *
 * @param selected - Indicates if the node is selected.
 * @returns A React component for the point node.
 */
export const POINT_NODE_SIZE = 14

function PointNodeBase({ selected, data }: NodeProps<NoteNode>) {
  const size = POINT_NODE_SIZE
  const showActive = Boolean((data as { endpointActive?: boolean }).endpointActive)
  const highlight = selected ? 'ring-2 ring-secondary ring-offset-2 ring-offset-background' : ''
  const fillClass = showActive ? 'bg-secondary' : 'bg-transparent'
  return (
    <div
      className={clsx('w-full h-full flex items-center justify-center pointer-events-auto')}
    >
      <Handle
        type="source"
        id="point"
        position={Position.Right}
        className="!opacity-0 !w-1 !h-1"
        isConnectable={false}
      />
      <Handle
        type="target"
        id="point"
        position={Position.Left}
        className="!opacity-0 !w-1 !h-1"
        isConnectable={false}
      />
      <div
        className={clsx(
          'rounded-full',
          fillClass,
          highlight,
        )}
        style={{ width: size, height: size }}
      />
    </div>
  )
}

export const PointNode = memo(PointNodeBase)
