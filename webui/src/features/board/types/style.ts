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
export type StrokeStyle = "solid" | "dashed" | "dotted"

/**
 * Fill style for the node.
 */
export type FillStyle = "solid" | "hachure" | "cross-hatch" | "zigzag" | "dots"

/**
 * Text alignment options for the node.
 */
export type TextAlign = "left" | "center" | "right"


/**
 * Font size options for the node.
 */
export type FontSize = "S" | "M" | "L" | "XL"

// Convert font size to Tailwind CSS class
export function fontSizeToTwClass(size?: FontSize): string {
  switch (size) {
    case "S":
      return "text-sm"
    case "M":
      return "text-base"
    case "L":
      return "text-lg"
    case "XL":
      return "text-xl"
    default:
      return "text-base"
  }
}


/**
 * Font family options for the node.
 */
export type FontFamily = "handwriting" | "sans-serif" | "serif" | "monospace"


// Convert font family to Tailwind CSS class
export function fontFamilyToTwClass(family?: FontFamily): string {
  switch (family) {
    case "handwriting":
      return "font-handwriting"
    case "sans-serif":
      return "font-sans"
    case "serif":
      return "font-serif"
    case "monospace":
      return "font-mono"
    default:
      return "font-sans"
  }
}


/**
 * Text style options for the node.
 */
export type TextStyle = "normal" | "bold" | "italic" | "underline" | "strikethrough"


// Convert text style to Tailwind CSS class
export function textStyleToTwClass(style?: TextStyle): string {
  switch (style) {
    case "normal":
      return "font-normal"
    case "bold":
      return "font-bold"
    case "italic":
      return "italic"
    case "underline":
      return "underline"
    case "strikethrough":
      return "line-through"
    default:
      return "font-normal"
  }
}


/**
 * Sloppiness (roughness) options for the node.
 */
export const SloppyPresets = [0, 0.5, 1]

export type Sloppiness = typeof SloppyPresets[number]

/**
 * Stroke width options for the node.
 */
export const StrokeWidthPresets = [0.75, 1, 2]

export type StrokeWidth = typeof StrokeWidthPresets[number]


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
  fontFamily?: FontFamily
  fontSize?: FontSize
  textAlign?: TextAlign
  textColor?: string | null
  textStyle?: TextStyle
}


/**
 * Default style for nodes in the board.
 */
export const defaultStyle = (): Style => ({
  type: "rectangle",
  angle: 0.0,
  strokeColor: "transparent",
  strokeWidth: 0.75,
  strokeStyle: "solid",
  backgroundColor: "oklch(0.954 0.038 75.164)",
  fillStyle: "solid",
  roughness: 0.5,
  opacity: 100,
  groupIds: [],
  fontFamily: "handwriting",
  fontSize: "M",
  textAlign: "left",
  textColor: "black",
  textStyle: "normal"
})