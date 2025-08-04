import { Position } from '@xyflow/react'

function getAutoHandlePositions(
  sx: number,
  sy: number,
  tx: number,
  ty: number
): { sourcePosition: Position, targetPosition: Position } {
  const dx = Math.abs(sx - tx)
  const dy = Math.abs(sy - ty)

  let sourcePosition: Position
  let targetPosition: Position

  if (dx > dy) {
    // More horizontal
    if (sx < tx) {
      sourcePosition = Position.Right
      targetPosition = Position.Left
    } else {
      sourcePosition = Position.Left
      targetPosition = Position.Right
    }
  } else {
    // More vertical
    if (sy < ty) {
      sourcePosition = Position.Bottom
      targetPosition = Position.Top
    } else {
      sourcePosition = Position.Top
      targetPosition = Position.Bottom
    }
  }

  return { sourcePosition, targetPosition }
}

export { getAutoHandlePositions }