import { Handle, Position, type NodeProps } from '@xyflow/react'
import clsx from 'clsx'
import type { NoteNode } from '../../types/flow'


/**
 * Component representing a point node in the flow board.
 *
 * @param selected - Indicates if the node is selected.
 * @returns A React component for the point node.
 */
export function PointNode({ selected }: NodeProps<NoteNode>) {
  const size = 14
  const highlight = selected ? 'ring-2 ring-secondary ring-offset-2 ring-offset-background' : ''
  return (
    <div
      className={clsx('w-full h-full flex items-center justify-center pointer-events-auto')}
    >
      <Handle
        type="source"
        id="point"
        position={Position.Right}
        className="!opacity-0 !w-1 !h-1"
      />
      <Handle
        type="target"
        id="point"
        position={Position.Left}
        className="!opacity-0 !w-1 !h-1"
      />
      <div
        className={clsx(
          'rounded-full bg-secondary',
          highlight,
        )}
        style={{ width: size, height: size }}
      />
    </div>
  )
}
