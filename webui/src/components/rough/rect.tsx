import React, { useCallback, useEffect, useRef } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import { useViewport } from '@xyflow/react'
import clsx from 'clsx'
import type { StrokeStyle } from '@/features/board/types/style'
import { getCachedCanvas, serializeCacheKey } from './cache'

type RoundedClass = 'none' | 'rounded-2xl'

type RoughRectProps = {
  children?: React.ReactNode
  rounded?: RoundedClass
  roughness?: number
  stroke?: string
  strokeStyle?: StrokeStyle // 'solid' | 'dashed' | 'dotted'
  strokeWidth?: number
  fill?: string
  fillStyle?: RoughOptions['fillStyle']
  className?: string
  seed?: number
}

type DrawConfig = {
  cssW: number
  cssH: number
  zoom: number
  rounded: RoundedClass
  roughness: number
  stroke: string
  strokeStyle: StrokeStyle
  strokeWidth: number
  fill?: string
  fillStyle?: RoughOptions['fillStyle']
  seed: number
  dpr: number
}

const drawConfigEqual = (a: DrawConfig | null, b: DrawConfig) => {
  if (!a) return false
  return (
    a.cssW === b.cssW &&
    a.cssH === b.cssH &&
    a.zoom === b.zoom &&
    a.rounded === b.rounded &&
    a.roughness === b.roughness &&
    a.stroke === b.stroke &&
    a.strokeStyle === b.strokeStyle &&
    a.strokeWidth === b.strokeWidth &&
    a.fill === b.fill &&
    a.fillStyle === b.fillStyle &&
    a.seed === b.seed &&
    a.dpr === b.dpr
  )
}

const quantizeZoom = (value: number): number => {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.1, Math.round(value * 10) / 10)
}

const clampOversample = (value: number): number => Math.min(Math.max(1, value), 1.5)

type DetailSettings = {
  curveStepCount: number
  maxRandomnessOffset: number
  hachureGap: number
}

const detailForSize = (maxSide: number): DetailSettings => {
  if (maxSide >= 800) return { curveStepCount: 5, maxRandomnessOffset: 1, hachureGap: 8 }
  if (maxSide >= 400) return { curveStepCount: 7, maxRandomnessOffset: 1.2, hachureGap: 6 }
  return { curveStepCount: 9, maxRandomnessOffset: 1.4, hachureGap: 5 }
}

/** Map logical stroke style to dash pattern and (optionally) desired canvas lineCap. */
function mapStrokeStyle(
  strokeStyle: StrokeStyle | undefined,
  strokeWidth: number | undefined
): {
  strokeLineDash?: number[]
  lineCap?: CanvasLineCap
} {
  const sw = Math.max(0.5, strokeWidth ?? 1)

  switch (strokeStyle) {
    case 'dashed':
      return {
        strokeLineDash: [5.5 * sw, 4 * sw],
        lineCap: 'round'
      }
    case 'dotted':
      // Round caps + [0, gap] yields pleasant dots
      return {
        strokeLineDash: [0, 3 * sw],
        lineCap: 'round'
      }
    case 'solid':
    default:
      return {
        strokeLineDash: undefined,
        lineCap: 'butt'
      }
  }
}

/**
 * RoughCanvas-based rectangle component.
 */
export const RoughRect: React.FC<RoughRectProps> = ({
  children,
  rounded = 'none',
  roughness = 1.2,
  stroke = 'transparent',
  strokeStyle = 'solid',
  strokeWidth = 1,
  fill,
  fillStyle = 'solid',
  className,
  seed = 1337
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastConfigRef = useRef<DrawConfig | null>(null)
  const rafRef = useRef<number | null>(null)
  const { zoom: viewportZoom = 1 } = useViewport()
  const effectiveZoom = quantizeZoom(viewportZoom)

  const draw = useCallback((wrapper: HTMLDivElement, canvas: HTMLCanvasElement) => {
    const rect = wrapper.getBoundingClientRect()
    const cssW = Math.max(1, wrapper.clientWidth || Math.floor(rect.width))
    const cssH = Math.max(1, wrapper.clientHeight || Math.floor(rect.height))
    if (cssW === 0 || cssH === 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

    // oversample backing store for zoom-in, clamped to avoid runaway buffers
    const oversample = clampOversample(effectiveZoom)

    // add a bleed in CSS units (display px), enough for stroke + jitter
    const bleed = Math.ceil((strokeWidth ?? 1) / 2 + (roughness ?? 1.2) * 1.5 + 2)

    const pixelW = Math.floor((cssW + bleed * 2) * dpr * oversample)
    const pixelH = Math.floor((cssH + bleed * 2) * dpr * oversample)
    if (canvas.width !== pixelW) canvas.width = pixelW
    if (canvas.height !== pixelH) canvas.height = pixelH

    canvas.style.width = cssW + 'px'
    canvas.style.height = cssH + 'px'

    const config: DrawConfig = {
      cssW,
      cssH,
      zoom: effectiveZoom,
      rounded,
      roughness,
      stroke,
      strokeStyle,
      strokeWidth,
      fill,
      fillStyle,
      seed,
      dpr
    }

    if (drawConfigEqual(lastConfigRef.current, config)) {
      return
    }

    const visibleStroke = stroke === 'transparent' && !fill ? '#222' : stroke

    // hairline crispness without eating tiny boxes
    const inset = (strokeWidth ?? 1) <= 1.5 ? Math.min(0.5, cssW / 4, cssH / 4) : 0
    const w = Math.max(0, cssW - inset * 2)
    const h = Math.max(0, cssH - inset * 2)

    const baseRadius = rounded === 'rounded-2xl' ? 16 : 0
    const radius = Math.max(0, Math.min(baseRadius, w / 2, h / 2))

    const pathData = radius > 0
      ? excalidrawRoundedRectPath(inset, inset, w, h, radius)
      : rectPath(inset, inset, w, h)

    const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)
    const { curveStepCount, maxRandomnessOffset, hachureGap } = detailForSize(Math.max(cssW, cssH))

    const cacheKey = serializeCacheKey([
      'rect',
      rounded,
      roughness,
      visibleStroke,
      strokeStyle,
      strokeWidth,
      fill || '',
      fillStyle || '',
      seed,
      effectiveZoom,
      dpr,
      cssW,
      cssH,
    ])

    const offscreen = getCachedCanvas(cacheKey, pixelW, pixelH, target => {
      const offCtx = target.getContext('2d')
      if (!offCtx) return

      offCtx.setTransform(1, 0, 0, 1, 0, 0)
      offCtx.clearRect(0, 0, target.width, target.height)
      offCtx.setTransform(dpr * oversample, 0, 0, dpr * oversample, 0, 0)
      offCtx.translate(bleed, bleed)

      const rc = new RoughCanvas(target)
      const drawable = rc.generator.path(pathData, {
        roughness,
        stroke: visibleStroke,
        strokeWidth: strokeWidth ?? 1,
        fill,
        fillStyle,
        fillWeight: 1,
        bowing: 2,
        curveStepCount,
        maxRandomnessOffset,
        seed: seed || 1337,
        strokeLineDash,
        strokeLineDashOffset: 0,
        dashOffset: 8,
        dashGap: 16,
        hachureGap,
        disableMultiStroke: true,
        disableMultiStrokeFill: true,
        preserveVertices: true,
      })

      offCtx.save()
      if (lineCap) offCtx.lineCap = lineCap
      offCtx.lineJoin = 'round'
      rc.draw(drawable)
      offCtx.restore()
    })

    if (canvas.width !== offscreen.width) canvas.width = offscreen.width
    if (canvas.height !== offscreen.height) canvas.height = offscreen.height

    canvas.style.width = cssW + 'px'
    canvas.style.height = cssH + 'px'

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(offscreen, 0, 0)

    lastConfigRef.current = config
  }, [rounded, roughness, stroke, strokeWidth, fill, fillStyle, effectiveZoom, seed, strokeStyle])

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const wrapper = wrapperRef.current
      const canvas = canvasRef.current
      if (wrapper && canvas) {
        draw(wrapper, canvas)
      }
    })
  }, [draw])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const handleResize = () => scheduleRedraw()
    const ro = new ResizeObserver(handleResize)
    ro.observe(wrapper)

    scheduleRedraw()

    return () => {
      ro.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [scheduleRedraw])

  const mainDivClass = clsx('relative', className || '')

  return (
    <div ref={wrapperRef} className={mainDivClass}>
      <canvas
        ref={canvasRef}
        className='absolute inset-0 w-full h-full pointer-events-none'
        style={{ zIndex: 10, background: 'transparent' }}
      />
      <div className='relative z-20 w-full h-full'>
        {children}
      </div>
    </div>
  )
}

// plain rectangle path
function rectPath(x: number, y: number, w: number, h: number): string {
  return `M${x},${y} h${w} v${h} h-${w} Z`
}

// Excalidraw-style curved-corner rectangle using quadratic Béziers
function excalidrawRoundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): string {
  const R = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  const x0 = x
  const y0 = y
  const x1 = x + w
  const y1 = y + h

  // clockwise: top-left → top-right → bottom-right → bottom-left → close
  return [
    `M ${x0 + R} ${y0}`,
    `L ${x1 - R} ${y0}`,
    `Q ${x1} ${y0}, ${x1} ${y0 + R}`,
    `L ${x1} ${y1 - R}`,
    `Q ${x1} ${y1}, ${x1 - R} ${y1}`,
    `L ${x0 + R} ${y1}`,
    `Q ${x0} ${y1}, ${x0} ${y1 - R}`,
    `L ${x0} ${y0 + R}`,
    `Q ${x0} ${y0}, ${x0 + R} ${y0}`,
    `Z`
  ].join(' ')
}
