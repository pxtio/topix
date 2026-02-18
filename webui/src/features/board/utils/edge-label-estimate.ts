import type { FontFamily } from '../types/style'

type EdgeLabelEstimateInput = {
  text: string
  fontFamily?: FontFamily
  maxWidth?: number
}


type EdgeLabelEstimateSize = {
  width: number
  height: number
}


const DEFAULT_MAX_WIDTH = 200
const H_PADDING = 0
const V_PADDING = 0


function getFontPx(fontFamily?: FontFamily): number {
  if (fontFamily === 'informal') return 17
  return 16
}


function getLineHeightPx(fontFamily?: FontFamily): number {
  const fontPx = getFontPx(fontFamily)
  return fontPx * 1.5
}


function stripMarkdownSyntax(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$\n]+\$/g, '')
}


export function estimateEdgeLabelSize({
  text,
  fontFamily,
  maxWidth = DEFAULT_MAX_WIDTH,
}: EdgeLabelEstimateInput): EdgeLabelEstimateSize {
  const raw = stripMarkdownSyntax(text).trim()
  if (!raw) {
    return {
      width: Math.min(maxWidth, 96),
      height: Math.ceil(getLineHeightPx(fontFamily) + V_PADDING),
    }
  }

  const fontPx = getFontPx(fontFamily)
  const lineHeight = getLineHeightPx(fontFamily)
  const charWidth = fontPx * 0.58
  const usableWidth = Math.max(64, maxWidth - H_PADDING)
  const charsPerLine = Math.max(8, Math.floor(usableWidth / charWidth))

  const lines = raw.split('\n')
  let wrappedLineCount = 0
  let longestLineChars = 0

  for (const line of lines) {
    const lineChars = Math.max(1, line.length)
    longestLineChars = Math.max(longestLineChars, lineChars)
    wrappedLineCount += Math.max(1, Math.ceil(lineChars / charsPerLine))
  }

  const estimatedTextWidth = Math.min(maxWidth, longestLineChars * charWidth)
  const width = Math.ceil(Math.max(96, estimatedTextWidth + H_PADDING))
  const height = Math.ceil(Math.max(lineHeight + V_PADDING, wrappedLineCount * lineHeight + V_PADDING))

  return { width, height }
}
