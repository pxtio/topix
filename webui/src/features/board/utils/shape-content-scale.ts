import type { NodeType } from '../types/style'

const SHAPE_CONTENT_SCALES: Partial<Record<NodeType, number>> = {
  diamond: 0.5,
  'soft-diamond': 0.5,
  'layered-diamond': 0.5,
  ellipse: 0.7,
  'layered-circle': 0.7,
}

export const getShapeContentScale = (type: NodeType) => SHAPE_CONTENT_SCALES[type] ?? 1
