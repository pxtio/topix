/**
 * @file Style types for the board feature.
 */

/**
 * Type of node in the board.
 */
export type NodeType = "rectangle" | "text" | "sheet" | "ellipse" | "diamond"

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
  type: NodeType
  angle: number
  strokeColor: string
  strokeWidth: number
  strokeStyle: StrokeStyle
  backgroundColor: string
  fillStyle: FillStyle
  roughness: number
  roundness: number
  opacity: number
  groupIds: string[]
  fontFamily: FontFamily
  fontSize: FontSize
  textAlign: TextAlign
  textColor: string
  textStyle: TextStyle
}


/**
 * Default style for nodes in the board.
 */
export const createDefaultStyle = ({
  type = "rectangle"
}: {
  type?: NodeType
}): Style => {
  const defaultOptions = {
    type: type,
    angle: 0.0,
    strokeColor: "#00000000",
    strokeWidth: 0.75,
    strokeStyle: "solid",
    backgroundColor: "#fed7aa",
    fillStyle: "solid",
    textColor: "#000000",
    textStyle: "normal",
    opacity: 100,
    groupIds: []
  }

  switch (type) {
    case "rectangle":
      return {
        ...defaultOptions,
        roughness: 0.5,
        roundness: 2,
        fontFamily: "handwriting",
        fontSize: "M",
        textAlign: "center",
        backgroundColor: "#dbeafe",
      } as Style
    case "ellipse":
      return {
        ...defaultOptions,
        roughness: 0.5,
        roundness: 2,
        fontFamily: "handwriting",
        fontSize: "M",
        textAlign: "center"
      } as Style
    case "diamond":
      return {
        ...defaultOptions,
        roughness: 0.5,
        roundness: 2,
        fontFamily: "handwriting",
        fontSize: "M",
        textAlign: "center"
      } as Style
    case "sheet":
      return {
        ...defaultOptions,
        roughness: 0,
        roundness: 0,
        fontFamily: "sans-serif",
        fontSize: "M",
        textAlign: "left"
      } as Style
    case "text":
      return {
        ...defaultOptions,
        roughness: 0,
        roundness: 0,
        fontFamily: "handwriting",
        fontSize: "M",
        textAlign: "left",
        backgroundColor: "#00000000"
      } as Style
  }
}