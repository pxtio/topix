import { memo, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { FontFamily, FontSize, TextAlign, TextStyle } from '@/features/board/types/style'


type InlineType =
  | 'text'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'highlight'
  | 'code'
  | 'link'


type Token =
  | { type: InlineType; content: string }
  | { type: 'code-block'; content: string }
  | { type: 'br' }
  | { type: 'hr' }
  | { type: 'hr-double' }


type StyledRun = {
  text: string
  type: InlineType
}


type LayoutLine =
  | { kind: 'text'; runs: StyledRun[] }
  | { kind: 'code-block'; runs: StyledRun[]; isFirst: boolean; isLast: boolean }
  | { kind: 'rule'; double: boolean }


type RenderOptions = {
  text: string
  width: number
  height: number
  renderScale: number
  dpr: number
  align: TextAlign
  fontFamily: FontFamily
  fontSize: FontSize
  textStyle: TextStyle
  textColor: string
}


type CacheEntry = {
  url: string
  lastUsed: number
}


type QueueTask = {
  key: string
  opts: RenderOptions
  listeners: Array<(url: string) => void>
}


const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|==[^=\s](?:[^=]*?[^=\s])?==|`[^`]+`|\*[^*]+\*|__[^_]+__|~~[^~]+~~|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
const HR_LINE_PATTERN = /^[ \t]*---[ \t]*$/
const DOUBLE_HR_LINE_PATTERN = /^[ \t]*===[ \t]*$/

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  handwriting: '"Shantell Sans", "Geist Handwriting Fallback", ui-handwriting, cursive',
  'sans-serif': 'system-ui, "Instrument Sans", "Geist Fallback", ui-sans-serif, sans-serif',
  serif: '"Source Serif 4", ui-serif, Georgia, serif',
  monospace: '"Ubuntu Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  informal: '"Gochi Hand", "Comic Sans", cursive, sans-serif',
}

const FONT_SIZE_MAP: Record<FontSize, number> = {
  S: 14,
  M: 16,
  L: 24,
  XL: 36,
}
const INFORMAL_FONT_SIZE_MAP: Record<FontSize, number> = {
  S: 15.4,
  M: 17.6,
  L: 26.4,
  XL: 39.6,
}

const H_PADDING = 8
const V_PADDING = 8
const CODE_BLOCK_PADDING_X = 6
const CODE_BLOCK_MARGIN_Y = 4
const MAX_CACHE_SIZE = 700
const MAX_WIDTH_CACHE_SIZE = 5000
const MIN_RENDER_SCALE = 0.15
const MAX_RENDER_SCALE = 1.5
const MAX_RENDER_WIDTH = 2000
const MAX_RENDER_HEIGHT = 1200
const FONT_SIZE_COMPENSATION = 1.08

const renderCache = new Map<string, CacheEntry>()
const pendingTasks = new Map<string, QueueTask>()
const taskQueue: QueueTask[] = []
let isQueueRunning = false

const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const measureCtx = measureCanvas?.getContext('2d') ?? null
const widthCache = new Map<string, number>()
const fontEpochListeners = new Set<(epoch: number) => void>()
let fontEpoch = 0
let fontTrackingInitialized = false

const clearRenderCache = () => {
  for (const entry of renderCache.values()) {
    URL.revokeObjectURL(entry.url)
  }
  renderCache.clear()
}

const clearMeasureCache = () => {
  widthCache.clear()
}

const emitFontEpoch = () => {
  for (const listener of fontEpochListeners) {
    listener(fontEpoch)
  }
}

const bumpFontEpoch = () => {
  fontEpoch += 1
  clearRenderCache()
  clearMeasureCache()
  emitFontEpoch()
}

const subscribeFontEpoch = (listener: (epoch: number) => void) => {
  fontEpochListeners.add(listener)
  return () => {
    fontEpochListeners.delete(listener)
  }
}

const initFontTracking = () => {
  if (fontTrackingInitialized) return
  fontTrackingInitialized = true

  if (typeof document === 'undefined' || !('fonts' in document)) return
  const fontSet = document.fonts
  let didSettleInitialFonts = false

  fontSet.ready
    .then(() => {
      if (didSettleInitialFonts) return
      didSettleInitialFonts = true
      bumpFontEpoch()
    })
    .catch(() => {
      // ignore
    })

  fontSet.addEventListener?.('loadingdone', () => {
    if (!didSettleInitialFonts) {
      didSettleInitialFonts = true
    }
    bumpFontEpoch()
  })
}

/**
 * Buckets zoom to avoid cache churn from tiny floating-point zoom deltas.
 */
const quantizeZoom = (value: number): number => {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.1, Math.round(value * 10) / 10)
}

/**
 * Buckets DPR to keep cache keys stable across tiny devicePixelRatio variance.
 */
const quantizeDpr = (value: number): number => {
  if (!Number.isFinite(value)) return 1
  const clamped = Math.max(1, Math.min(3, value))
  return Math.round(clamped * 4) / 4
}

/**
 * Chooses a render scale from base scale + viewport context.
 * While moving, prefer a lower quality snapshot for throughput.
 */
const resolveRenderScale = (baseScale: number, zoom: number, isMoving: boolean): number => {
  const clampedBase = Math.max(MIN_RENDER_SCALE, Math.min(MAX_RENDER_SCALE, baseScale))
  let idleScale = clampedBase
  if (zoom <= 0.4) {
    idleScale = 0.45
  } else if (zoom <= 0.7) {
    idleScale = 0.85
  } else if (zoom <= 1) {
    idleScale = 1.15
  } else if (zoom <= 1.8) {
    idleScale = 1.35
  } else {
    idleScale = 1 + (zoom - 1.8) * 0.2
  }

  idleScale = Math.max(
    MIN_RENDER_SCALE,
    Math.min(MAX_RENDER_SCALE, idleScale)
  )

  if (isMoving) {
    let movingScale = idleScale * (zoom >= 0.4 ? 0.72 : 0.6)
    if (zoom < 0.4) {
      movingScale = Math.min(movingScale, 0.22)
    } else if (zoom <= 0.7) {
      movingScale = Math.min(movingScale, 0.4)
    }
    return Math.max(MIN_RENDER_SCALE, Math.min(0.65, movingScale))
  }

  return idleScale
}


/**
 * Fast non-cryptographic hash used to avoid building huge cache keys from full text.
 */
const hashText = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}


/**
 * Normalizes quick symbol shorthand to unicode glyphs before tokenization.
 */
const transformSymbols = (value: string) =>
  value.replace(/<=>|<->|<-|->|\[\]|\[[vx]\]/gi, match => {
    const normalized = match.toLowerCase()
    if (normalized === '->') return '→'
    if (normalized === '<-') return '←'
    if (normalized === '<->') return '↔'
    if (normalized === '<=>') return '⇔'
    if (normalized === '[]') return '☐'
    if (normalized === '[v]') return '✅'
    if (normalized === '[x]') return '❎'
    return match
  })


/**
 * Splits one line into inline markdown tokens.
 * This parser intentionally supports a small markdown subset for fast rendering.
 */
function tokenizeInline(segment: string): Token[] {
  if (!segment) return []
  const tokens: Token[] = []
  let lastIndex = 0

  segment.replace(INLINE_PATTERN, (match, _group, offset) => {
    const idx = offset as number
    if (idx > lastIndex) {
      tokens.push({ type: 'text', content: transformSymbols(segment.slice(lastIndex, idx)) })
    }

    if ((match.startsWith('**') && match.endsWith('**')) || (match.startsWith('__') && match.endsWith('__'))) {
      tokens.push({ type: 'bold', content: transformSymbols(match.slice(2, -2)) })
    } else if (match.startsWith('*') && match.endsWith('*')) {
      tokens.push({ type: 'italic', content: transformSymbols(match.slice(1, -1)) })
    } else if (match.startsWith('~~') && match.endsWith('~~')) {
      tokens.push({ type: 'strike', content: transformSymbols(match.slice(2, -2)) })
    } else if (match.startsWith('==') && match.endsWith('==')) {
      tokens.push({ type: 'highlight', content: transformSymbols(match.slice(2, -2)) })
    } else if (match.startsWith('_') && match.endsWith('_')) {
      tokens.push({ type: 'underline', content: transformSymbols(match.slice(1, -1)) })
    } else if (match.startsWith('[') && match.includes('](') && match.endsWith(')')) {
      const splitIndex = match.indexOf('](')
      tokens.push({ type: 'link', content: transformSymbols(match.slice(1, splitIndex)) })
    } else if (match.startsWith('`') && match.endsWith('`')) {
      tokens.push({ type: 'code', content: match.slice(1, -1) })
    } else {
      tokens.push({ type: 'text', content: transformSymbols(match) })
    }

    lastIndex = idx + match.length
    return match
  })

  if (lastIndex < segment.length) {
    tokens.push({ type: 'text', content: transformSymbols(segment.slice(lastIndex)) })
  }

  return tokens
}


/**
 * Tokenizes multi-line markdown while preserving line breaks and rule lines.
 */
function tokenizeLine(line: string): Token[] {
  if (DOUBLE_HR_LINE_PATTERN.test(line)) return [{ type: 'hr-double' }]
  if (HR_LINE_PATTERN.test(line)) return [{ type: 'hr' }]
  return tokenizeInline(line)
}


/**
 * Tokenizes plain text sections (outside fenced code blocks) line by line.
 */
function tokenizeTextBlock(block: string): Token[] {
  if (!block) return []
  const tokens: Token[] = []
  const lines = block.split('\n')

  lines.forEach((line, index) => {
    tokens.push(...tokenizeLine(line))
    if (index < lines.length - 1) tokens.push({ type: 'br' })
  })

  return tokens
}


/**
 * Tokenizes full markdown input, with support for fenced code blocks.
 * Code blocks are display-only (no language badge / syntax highlighting).
 */
function tokenize(input: string): Token[] {
  if (!input) return []
  const tokens: Token[] = []
  let cursor = 0

  while (cursor < input.length) {
    const fenceStart = input.indexOf('```', cursor)
    if (fenceStart === -1) {
      tokens.push(...tokenizeTextBlock(input.slice(cursor)))
      break
    }

    if (fenceStart > cursor) {
      tokens.push(...tokenizeTextBlock(input.slice(cursor, fenceStart)))
    }

    const fenceEnd = input.indexOf('```', fenceStart + 3)
    if (fenceEnd === -1) {
      tokens.push(...tokenizeTextBlock(input.slice(fenceStart)))
      break
    }

    const fenceContent = input.slice(fenceStart + 3, fenceEnd)
    const delimiterIndex = fenceContent.search(/[\r\n]/)
    let codeContent = fenceContent
    if (delimiterIndex >= 0) {
      codeContent = fenceContent.slice(delimiterIndex).replace(/^\r?\n/, '')
    }

    tokens.push({ type: 'code-block', content: codeContent.replace(/\r\n/g, '\n') })
    cursor = fenceEnd + 3
  }

  return tokens
}


/**
 * Breaks text into words/spaces so wrapping logic can preserve spacing.
 */
const splitChunks = (text: string): string[] => text.split(/(\s+)/g).filter(Boolean)


/**
 * Resolves effective font weight from inline token style plus node text style.
 */
const getFontWeight = (type: InlineType, textStyle: TextStyle): string => {
  if (type === 'bold' || textStyle === 'bold') return '700'
  return '400'
}


/**
 * Resolves effective font style from inline token style plus node text style.
 */
const getFontStyle = (type: InlineType, textStyle: TextStyle): string => {
  if (type === 'italic' || textStyle === 'italic') return 'italic'
  return 'normal'
}


/**
 * Chooses font family for each token type.
 * Inline code always uses monospace regardless of node font family.
 */
const getFontFamily = (type: InlineType, fontFamily: FontFamily): string => {
  if (type === 'code') return FONT_FAMILY_MAP.monospace
  return FONT_FAMILY_MAP[fontFamily]
}

/**
 * Resolves pixel font size for renderer layout and drawing.
 * Informal uses a custom scale to match CSS adjustments in index.css.
 */
const getFontSizePx = (fontSize: FontSize, fontFamily: FontFamily): number => {
  const baseSize = fontFamily === 'informal'
    ? INFORMAL_FONT_SIZE_MAP[fontSize]
    : FONT_SIZE_MAP[fontSize]
  return baseSize * FONT_SIZE_COMPENSATION
}


/**
 * Builds a canvas font string used by both text measurement and draw calls.
 */
const getCanvasFont = ({
  type,
  fontFamily,
  fontSize,
  textStyle,
}: {
  type: InlineType
  fontFamily: FontFamily
  fontSize: FontSize
  textStyle: TextStyle
}) => `${getFontStyle(type, textStyle)} ${getFontWeight(type, textStyle)} ${getFontSizePx(fontSize, fontFamily)}px ${getFontFamily(type, fontFamily)}`


/**
 * Measures text width with memoization to avoid repeated canvas measurements.
 * Cache key includes both text and full font descriptor.
 */
const measureText = ({
  text,
  type,
  fontFamily,
  fontSize,
  textStyle,
}: {
  text: string
  type: InlineType
  fontFamily: FontFamily
  fontSize: FontSize
  textStyle: TextStyle
}): number => {
  if (!text) return 0
  const font = getCanvasFont({ type, fontFamily, fontSize, textStyle })
  const key = `${font}|${text}`
  const cached = widthCache.get(key)
  if (cached !== undefined) return cached

  if (!measureCtx) return text.length * getFontSizePx(fontSize, fontFamily) * 0.55

  measureCtx.font = font
  const width = measureCtx.measureText(text).width
  widthCache.set(key, width)
  if (widthCache.size > MAX_WIDTH_CACHE_SIZE) {
    const oldestKey = widthCache.keys().next().value
    if (oldestKey) widthCache.delete(oldestKey)
  }
  return width
}


/**
 * Wraps one code line by character width using monospace metrics.
 * This preserves whitespace and guarantees fit within available width.
 */
const wrapCodeLine = (line: string, opts: RenderOptions, maxWidth: number): string[] => {
  const normalized = line.replace(/\t/g, '  ')
  if (!normalized) return ['']

  const wrapped: string[] = []
  let part = ''

  for (const ch of normalized) {
    const next = part + ch
    const nextWidth = measureText({
      text: next,
      type: 'code',
      fontFamily: opts.fontFamily,
      fontSize: opts.fontSize,
      textStyle: 'normal',
    })

    if (part && nextWidth > maxWidth) {
      wrapped.push(part)
      part = ch
    } else {
      part = next
    }
  }

  if (part) wrapped.push(part)
  return wrapped
}


/**
 * Performs text wrapping/layout and converts tokens into drawable lines.
 * Output lines are consumed by the canvas draw pass.
 */
function layoutTokens(tokens: Token[], opts: RenderOptions): LayoutLine[] {
  const maxWidth = Math.max(40, opts.width - H_PADDING * 2)

  const lines: LayoutLine[] = []
  let currentRuns: StyledRun[] = []
  let cursorX = 0

  const pushLine = () => {
    lines.push({ kind: 'text', runs: currentRuns })
    currentRuns = []
    cursorX = 0
  }

  const pushRule = (double: boolean) => {
    if (currentRuns.length > 0) pushLine()
    lines.push({ kind: 'rule', double })
  }

  const pushCodeBlock = (content: string) => {
    if (currentRuns.length > 0) pushLine()
    const rawLines = content.split('\n')
    const visualRuns: StyledRun[][] = []
    const codeMaxWidth = Math.max(20, maxWidth - CODE_BLOCK_PADDING_X * 2)

    rawLines.forEach(raw => {
      wrapCodeLine(raw, opts, codeMaxWidth).forEach(part => {
        visualRuns.push([{ text: part, type: 'code' }])
      })
    })

    if (visualRuns.length === 0) {
      lines.push({ kind: 'code-block', runs: [], isFirst: true, isLast: true })
      return
    }

    visualRuns.forEach((runs, index) => {
      lines.push({
        kind: 'code-block',
        runs,
        isFirst: index === 0,
        isLast: index === visualRuns.length - 1,
      })
    })
  }

  const pushChunk = (chunk: string, type: InlineType) => {
    if (!chunk) return

    const chunkWidth = measureText({
      text: chunk,
      type,
      fontFamily: opts.fontFamily,
      fontSize: opts.fontSize,
      textStyle: opts.textStyle,
    })

    if (!chunk.trim()) {
      if (cursorX === 0) return
      currentRuns.push({ text: chunk, type })
      cursorX += chunkWidth
      return
    }

    if (cursorX > 0 && cursorX + chunkWidth > maxWidth) {
      pushLine()
    }

    if (chunkWidth > maxWidth && chunk.length > 1) {
      let part = ''
      for (const ch of chunk) {
        const next = part + ch
        const nextWidth = measureText({
          text: next,
          type,
          fontFamily: opts.fontFamily,
          fontSize: opts.fontSize,
          textStyle: opts.textStyle,
        })
        if (cursorX > 0 && nextWidth > maxWidth) {
          if (part) {
            currentRuns.push({ text: part, type })
            cursorX += measureText({
              text: part,
              type,
              fontFamily: opts.fontFamily,
              fontSize: opts.fontSize,
              textStyle: opts.textStyle,
            })
          }
          pushLine()
          part = ch
        } else {
          part = next
        }
      }

      if (part) {
        currentRuns.push({ text: part, type })
        cursorX += measureText({
          text: part,
          type,
          fontFamily: opts.fontFamily,
          fontSize: opts.fontSize,
          textStyle: opts.textStyle,
        })
      }
      return
    }

    currentRuns.push({ text: chunk, type })
    cursorX += chunkWidth
  }

  tokens.forEach(token => {
    if (token.type === 'code-block') {
      pushCodeBlock(token.content)
      return
    }

    if (token.type === 'br') {
      pushLine()
      return
    }

    if (token.type === 'hr') {
      pushRule(false)
      return
    }

    if (token.type === 'hr-double') {
      pushRule(true)
      return
    }

    splitChunks(token.content).forEach(chunk => pushChunk(chunk, token.type))
  })

  if (currentRuns.length > 0 || lines.length === 0) {
    lines.push({ kind: 'text', runs: currentRuns })
  }

  return lines
}


/**
 * Computes horizontal starting x for one line based on node text alignment.
 */
const getTextX = (opts: RenderOptions, lineWidth: number): number => {
  if (opts.align === 'center') return Math.floor((opts.width - lineWidth) / 2)
  if (opts.align === 'right') return Math.max(H_PADDING, opts.width - H_PADDING - lineWidth)
  return H_PADDING
}


/**
 * Returns vertical advance for one layout line, including code-block margins.
 */
const getLineAdvance = (line: LayoutLine, lineHeight: number): number => {
  if (line.kind !== 'code-block') return lineHeight
  let advance = lineHeight
  if (line.isFirst) advance += CODE_BLOCK_MARGIN_Y
  if (line.isLast) advance += CODE_BLOCK_MARGIN_Y
  return advance
}


/**
 * Draws underline/strikethrough decorations after the text run is painted.
 */
const drawRunDecoration = ({
  ctx,
  x,
  y,
  width,
  type,
  fontSize,
}: {
  ctx: CanvasRenderingContext2D
  x: number
  y: number
  width: number
  type: InlineType
  fontSize: number
}) => {
  if (type === 'underline' || type === 'link') {
    const lineY = y + 2
    ctx.beginPath()
    ctx.moveTo(x, lineY)
    ctx.lineTo(x + width, lineY)
    ctx.lineWidth = 1
    ctx.stroke()
  }

  if (type === 'strike') {
    const lineY = y - Math.floor(fontSize * 0.35)
    ctx.beginPath()
    ctx.moveTo(x, lineY)
    ctx.lineTo(x + width, lineY)
    ctx.lineWidth = 1
    ctx.stroke()
  }
}


/**
 * Paints the laid-out markdown lines into the target canvas context.
 * Includes vertical centering, background chips (code/highlight), and decorations.
 */
const drawToCanvas = (ctx: CanvasRenderingContext2D, opts: RenderOptions, lines: LayoutLine[]) => {
  ctx.clearRect(0, 0, opts.width, opts.height)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = opts.textColor
  ctx.strokeStyle = opts.textColor

  const fontSizePx = getFontSizePx(opts.fontSize, opts.fontFamily)
  const lineHeight = Math.ceil(fontSizePx * 1.35)
  const contentHeight = Math.max(
    lineHeight,
    lines.reduce((sum, line) => sum + getLineAdvance(line, lineHeight), 0)
  )
  const centeredTop = Math.floor((opts.height - contentHeight) / 2)
  const startBaseline = Math.max(V_PADDING + fontSizePx, centeredTop + fontSizePx)
  let y = startBaseline

  for (const line of lines) {
    if (y > opts.height - V_PADDING) break

    if (line.kind === 'code-block') {
      if (line.isFirst) y += CODE_BLOCK_MARGIN_Y

      let lineWidth = 0
      line.runs.forEach(run => {
        lineWidth += measureText({
          text: run.text,
          type: run.type,
          fontFamily: opts.fontFamily,
          fontSize: opts.fontSize,
          textStyle: 'normal',
        })
      })

      const blockX = H_PADDING
      const blockY = y - fontSizePx + 2
      const blockWidth = Math.max(10, opts.width - H_PADDING * 2)
      const blockHeight = lineHeight

      ctx.save()
      ctx.fillStyle = 'rgba(148, 163, 184, 0.18)'
      ctx.fillRect(blockX, blockY, blockWidth, blockHeight)
      ctx.restore()

      let x = blockX + CODE_BLOCK_PADDING_X
      if (opts.align === 'center') {
        x = blockX + Math.max(CODE_BLOCK_PADDING_X, Math.floor((blockWidth - lineWidth) / 2))
      } else if (opts.align === 'right') {
        x = blockX + Math.max(CODE_BLOCK_PADDING_X, blockWidth - CODE_BLOCK_PADDING_X - lineWidth)
      }

      for (const run of line.runs) {
        const runWidth = measureText({
          text: run.text,
          type: run.type,
          fontFamily: opts.fontFamily,
          fontSize: opts.fontSize,
          textStyle: 'normal',
        })

        ctx.font = getCanvasFont({
          type: run.type,
          fontFamily: opts.fontFamily,
          fontSize: opts.fontSize,
          textStyle: 'normal',
        })
        ctx.fillStyle = opts.textColor
        ctx.strokeStyle = opts.textColor
        ctx.fillText(run.text, x, y)
        x += runWidth
      }

      y += lineHeight
      if (line.isLast) y += CODE_BLOCK_MARGIN_Y
      continue
    }

    if (line.kind === 'rule') {
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      ctx.moveTo(H_PADDING, y)
      ctx.lineTo(opts.width - H_PADDING, y)
      ctx.lineWidth = 1
      ctx.stroke()
      if (line.double) {
        ctx.beginPath()
        ctx.moveTo(H_PADDING, y + 3)
        ctx.lineTo(opts.width - H_PADDING, y + 3)
        ctx.lineWidth = 1
        ctx.stroke()
      }
      ctx.restore()
      y += lineHeight
      continue
    }

    let lineWidth = 0
    line.runs.forEach(run => {
      lineWidth += measureText({
        text: run.text,
        type: run.type,
        fontFamily: opts.fontFamily,
        fontSize: opts.fontSize,
        textStyle: opts.textStyle,
      })
    })

    let x = getTextX(opts, lineWidth)

    for (const run of line.runs) {
      const runWidth = measureText({
        text: run.text,
        type: run.type,
        fontFamily: opts.fontFamily,
        fontSize: opts.fontSize,
        textStyle: opts.textStyle,
      })

      if (run.type === 'highlight') {
        ctx.save()
        ctx.fillStyle = 'rgba(253, 224, 71, 0.8)'
        ctx.fillRect(x - 1, y - fontSizePx + 2, runWidth + 2, fontSizePx + 2)
        ctx.restore()
      }

      if (run.type === 'code') {
        ctx.save()
        ctx.fillStyle = 'rgba(148, 163, 184, 0.18)'
        ctx.fillRect(x - 2, y - fontSizePx + 2, runWidth + 4, fontSizePx + 3)
        ctx.restore()
      }

      ctx.font = getCanvasFont({
        type: run.type,
        fontFamily: opts.fontFamily,
        fontSize: opts.fontSize,
        textStyle: opts.textStyle,
      })
      ctx.fillStyle = run.type === 'link' ? '#2563eb' : opts.textColor
      ctx.strokeStyle = run.type === 'link' ? '#2563eb' : opts.textColor
      ctx.fillText(run.text, x, y)
      drawRunDecoration({
        ctx,
        x,
        y,
        width: runWidth,
        type: run.type,
        fontSize: fontSizePx,
      })

      x += runWidth
    }

    y += lineHeight
  }
}


/**
 * End-to-end renderer for one markdown payload:
 * layout -> draw to canvas -> encode PNG blob -> return object URL.
 */
const renderToObjectUrl = async (opts: RenderOptions): Promise<string> => {
  const renderScale = Math.max(MIN_RENDER_SCALE, Math.min(MAX_RENDER_SCALE, opts.renderScale))
  const dprScale = Math.max(1, Math.min(3, opts.dpr))
  const baseScale = renderScale * dprScale
  const limiter = Math.min(
    1,
    MAX_RENDER_WIDTH / (opts.width * baseScale),
    MAX_RENDER_HEIGHT / (opts.height * baseScale)
  )
  const effectiveScale = baseScale * limiter
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(opts.width * effectiveScale))
  canvas.height = Math.max(1, Math.ceil(opts.height * effectiveScale))

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')
  ctx.scale(effectiveScale, effectiveScale)

  const lines = layoutTokens(tokenize(opts.text), opts)
  drawToCanvas(ctx, opts, lines)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => {
      if (result) {
        resolve(result)
        return
      }
      reject(new Error('Canvas toBlob failed'))
    }, 'image/png')
  })

  return URL.createObjectURL(blob)
}


/**
 * Marks a cache entry as recently used for LRU-style eviction ordering.
 */
const touchCache = (key: string) => {
  const entry = renderCache.get(key)
  if (!entry) return
  entry.lastUsed = Date.now()
}


/**
 * Evicts least recently used rendered images when cache size exceeds cap.
 * Revokes object URLs on eviction to release browser memory.
 */
const evictIfNeeded = () => {
  if (renderCache.size <= MAX_CACHE_SIZE) return

  const entries = [...renderCache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)
  const toRemoveCount = renderCache.size - MAX_CACHE_SIZE

  for (let index = 0; index < toRemoveCount; index += 1) {
    const victim = entries[index]
    if (!victim) break
    renderCache.delete(victim[0])
    URL.revokeObjectURL(victim[1].url)
  }
}


/**
 * Inserts or replaces a rendered image in cache.
 * Replacing an entry revokes old object URL to prevent leaks.
 */
const setCache = (key: string, url: string) => {
  const existing = renderCache.get(key)
  if (existing) {
    URL.revokeObjectURL(existing.url)
  }

  renderCache.set(key, { url, lastUsed: Date.now() })
  evictIfNeeded()
}


/**
 * Sequentially processes render tasks from the queue.
 * Each completed task notifies all listeners waiting on the same key.
 */
const runQueue = async () => {
  if (isQueueRunning) return
  isQueueRunning = true

  while (taskQueue.length > 0) {
    const task = taskQueue.shift()
    if (!task) continue

    let url = ''

    try {
      url = await renderToObjectUrl(task.opts)
      setCache(task.key, url)
    } catch {
      url = ''
    }

    const pending = pendingTasks.get(task.key)
    pendingTasks.delete(task.key)

    if (pending) {
      pending.listeners.forEach(listener => listener(url))
    }
  }

  isQueueRunning = false
}


/**
 * Adds a render request to queue with de-duplication:
 * - immediate callback on cache hit
 * - coalesced listeners when same key is already pending.
 */
const enqueueRender = (key: string, opts: RenderOptions, listener: (url: string) => void) => {
  const cached = renderCache.get(key)
  if (cached) {
    touchCache(key)
    listener(cached.url)
    return
  }

  const existing = pendingTasks.get(key)
  if (existing) {
    existing.listeners.push(listener)
    return
  }

  const task: QueueTask = {
    key,
    opts,
    listeners: [listener],
  }

  pendingTasks.set(key, task)
  taskQueue.push(task)
  void runQueue()
}


export type CanvasLiteMarkdownProps = {
  text: string
  className?: string
  width?: number
  height?: number
  renderScale?: number
  zoom?: number
  isMoving?: boolean
  align?: TextAlign
  fontFamily?: FontFamily
  fontSize?: FontSize
  textStyle?: TextStyle
  textColor?: string
}


/**
 * Queue-backed canvas renderer for lite markdown display.
 * This is display-only and intended to reduce DOM paint cost while panning.
 */
export const CanvasLiteMarkdown = memo(function CanvasLiteMarkdown({
  text,
  className,
  width,
  height,
  renderScale = 1,
  zoom = 1,
  isMoving = false,
  align = 'left',
  fontFamily = 'handwriting',
  fontSize = 'M',
  textStyle = 'normal',
  textColor = '#1f2937',
}: CanvasLiteMarkdownProps) {
  const [fontEpochState, setFontEpochState] = useState(() => fontEpoch)
  const resolvedWidth = Math.max(40, Math.ceil(width ?? 280))
  const resolvedHeight = Math.max(40, Math.ceil(height ?? 140))
  const normalizedText = text.trim()
  const quantizedZoom = useMemo(() => quantizeZoom(zoom), [zoom])
  const dprBucket = useMemo(() => {
    if (typeof window === 'undefined') return 1
    return quantizeDpr(window.devicePixelRatio || 1)
  }, [])
  const effectiveRenderScale = useMemo(
    () => resolveRenderScale(renderScale, quantizedZoom, isMoving),
    [renderScale, quantizedZoom, isMoving]
  )

  const textHash = useMemo(() => hashText(text), [text])

  const cacheKey = useMemo(
    () => `${fontEpochState}:${textHash}:${text.length}:${resolvedWidth}:${resolvedHeight}:${quantizedZoom}:${dprBucket}:${effectiveRenderScale}:${align}:${fontFamily}:${fontSize}:${textStyle}:${textColor}`,
    [fontEpochState, textHash, text.length, resolvedWidth, resolvedHeight, quantizedZoom, dprBucket, effectiveRenderScale, align, fontFamily, fontSize, textStyle, textColor]
  )

  const [renderUrl, setRenderUrl] = useState<string>(() => renderCache.get(cacheKey)?.url ?? '')

  useEffect(() => {
    initFontTracking()
    return subscribeFontEpoch(setFontEpochState)
  }, [])

  /**
   * Requests a rendered bitmap for current props and updates local image URL
   * when queue processing finishes.
   */
  useEffect(() => {
    if (!normalizedText) {
      setRenderUrl('')
      return
    }

    let cancelled = false

    enqueueRender(
      cacheKey,
      {
        text,
        width: resolvedWidth,
        height: resolvedHeight,
        renderScale: effectiveRenderScale,
        dpr: dprBucket,
        align,
        fontFamily,
        fontSize,
        textStyle,
        textColor,
      },
      url => {
        if (cancelled) return
        setRenderUrl(url)
      }
    )

    return () => {
      cancelled = true
    }
  }, [cacheKey, normalizedText, text, resolvedWidth, resolvedHeight, effectiveRenderScale, align, fontFamily, fontSize, textStyle, textColor, dprBucket])

  if (!normalizedText) return null

  if (!renderUrl) {
    return (
      <span className={clsx('whitespace-pre-wrap break-words', className)}>
        {text}
      </span>
    )
  }

  return (
    <img
      src={renderUrl}
      alt=''
      draggable={false}
      className={clsx('block w-full h-full select-none pointer-events-none', className)}
      style={{
        imageRendering: 'auto',
      }}
    />
  )
})
