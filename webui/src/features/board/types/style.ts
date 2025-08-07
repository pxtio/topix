/**
 * @file Style types for the board feature.
 */

/**
 * Type of node in the board.
 */
export type NodeType = "rectangle" | "text"

/**
 * Stroke style for the node.
 */
export type StrokeStyle = "solid" | "dashed"

/**
 * Fill style for the node.
 */
export type FillStyle = "solid"

/**
 * Text alignment options for the node.
 */
export type TextAlign = "left" | "center" | "right"


/**
 * Interface for the style of a node in the board.
 */
export interface Style {
  type?: NodeType
  angle?: number
  strokeColor?: string
  strokeWidth?: number
  strokeStyle?: StrokeStyle
  backgroundColor?: string
  fillStyle: FillStyle
  roughness: number
  opacity?: number
  groupIds?: string[]
  fontFamily?: string
  textAlign?: TextAlign
  color?: string | null
}


/**
 * Default style for nodes in the board.
 */
export const defaultStyle = (): Style => ({
  type: "rectangle",
  angle: 0.0,
  strokeColor: "transparent",
  strokeWidth: 1,
  strokeStyle: "solid",
  backgroundColor: "oklch(0.954 0.038 75.164)",
  fillStyle: "solid",
  roughness: 1.2,
  opacity: 100,
  groupIds: [],
  fontFamily: undefined,
  textAlign: "left",
  color: "black",
})