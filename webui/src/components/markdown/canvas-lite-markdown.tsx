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
  | { type: 'br' }
  | { type: 'hr' }
  | { type: 'hr-double' }


type StyledRun = {
  text: string
  type: InlineType
}


type LayoutLine =
  | { kind: 'text'; runs: StyledRun[] }
  | { kind: 'rule'; double: boolean }


type RenderOptions = {
  text: string
  width: number
  height: number
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

const H_PADDING = 8
const V_PADDING = 8
const MAX_CACHE_SIZE = 700

const renderCache = new Map<string, CacheEntry>()
const pendingTasks = new Map<string, QueueTask>()
const taskQueue: QueueTask[] = []
let isQueueRunning = false

const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const measureCtx = measureCanvas?.getContext('2d') ?? null
const widthCache = new Map<string, number>()


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
function tokenize(input: string): Token[] {
  if (!input) return []
  const tokens: Token[] = []
  const lines = input.split('\n')

  lines.forEach((line, index) => {
    if (DOUBLE_HR_LINE_PATTERN.test(line)) {
      tokens.push({ type: 'hr-double' })
    } else if (HR_LINE_PATTERN.test(line)) {
      tokens.push({ type: 'hr' })
    } else {
      tokens.push(...tokenizeInline(line))
    }

    if (index < lines.length - 1) {
      tokens.push({ type: 'br' })
    }
  })

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
}) => `${getFontStyle(type, textStyle)} ${getFontWeight(type, textStyle)} ${FONT_SIZE_MAP[fontSize]}px ${getFontFamily(type, fontFamily)}`


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

  if (!measureCtx) return text.length * FONT_SIZE_MAP[fontSize] * 0.55

  measureCtx.font = font
  const width = measureCtx.measureText(text).width
  widthCache.set(key, width)
  return width
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

  const fontSizePx = FONT_SIZE_MAP[opts.fontSize]
  const lineHeight = Math.ceil(fontSizePx * 1.35)
  const contentHeight = Math.max(lineHeight, lines.length * lineHeight)
  const centeredTop = Math.floor((opts.height - contentHeight) / 2)
  const startBaseline = Math.max(V_PADDING + fontSizePx, centeredTop + fontSizePx)
  let y = startBaseline

  for (const line of lines) {
    if (y > opts.height - V_PADDING) break

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
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(40, Math.floor(opts.width))
  canvas.height = Math.max(40, Math.floor(opts.height))

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

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
  align = 'left',
  fontFamily = 'handwriting',
  fontSize = 'M',
  textStyle = 'normal',
  textColor = '#1f2937',
}: CanvasLiteMarkdownProps) {
  const resolvedWidth = Math.max(40, Math.floor(width ?? 280))
  const resolvedHeight = Math.max(40, Math.floor(height ?? 140))

  const cacheKey = useMemo(
    () => JSON.stringify({ text, resolvedWidth, resolvedHeight, align, fontFamily, fontSize, textStyle, textColor }),
    [text, resolvedWidth, resolvedHeight, align, fontFamily, fontSize, textStyle, textColor]
  )

  const [renderUrl, setRenderUrl] = useState<string>(() => renderCache.get(cacheKey)?.url ?? '')

  /**
   * Requests a rendered bitmap for current props and updates local image URL
   * when queue processing finishes.
   */
  useEffect(() => {
    let cancelled = false

    enqueueRender(
      cacheKey,
      {
        text,
        width: resolvedWidth,
        height: resolvedHeight,
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
  }, [cacheKey, text, resolvedWidth, resolvedHeight, align, fontFamily, fontSize, textStyle, textColor])

  if (!text.trim()) return null

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
