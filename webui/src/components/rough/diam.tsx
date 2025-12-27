import React, { useCallback, useEffect, useRef } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import { useViewport } from '@xyflow/react'
import clsx from 'clsx'
import type { StrokeStyle } from '@/features/board/types/style'
import { getCachedCanvas, serializeCacheKey } from './cache'

type RoundedClass = 'none' | 'rounded-2xl'

type RoughShapeProps = {
  children?: React.ReactNode
  roughness?: number
  stroke?: string
  strokeStyle?: StrokeStyle // 'solid' | 'dashed' | 'dotted'
  strokeWidth?: number
  fill?: string
  fillStyle?: RoughOptions['fillStyle']
  className?: string
  seed?: number
}

type RoughDiamondProps = RoughShapeProps & {
  rounded?: RoundedClass
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
  renderScale: number
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
    a.dpr === b.dpr &&
    a.renderScale === b.renderScale
  )
}

const quantizeZoom = (value: number): number => {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.1, Math.round(value * 10) / 10)
}

const oversampleForZoom = (value: number): number => {
  if (!Number.isFinite(value)) return 1
  if (value >= 1) {
    return Math.min(1.5, 1 + (value - 1) * 0.5)
  }
  return Math.max(0.1, value)
}
const MAX_RENDER_WIDTH = 1600
const MAX_RENDER_HEIGHT = 900
const RENDER_SCALE_FACTOR = 0.75

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

/** Map logical stroke style to dash pattern + desired canvas lineCap (set on ctx). */
function mapStrokeStyle(
  strokeStyle: StrokeStyle | undefined,
  strokeWidth: number | undefined
): { strokeLineDash?: number[], lineCap?: CanvasLineCap } {
  const sw = Math.max(0.5, strokeWidth ?? 1)
  switch (strokeStyle) {
    case 'dashed':
      return { strokeLineDash: [5.5 * sw, 4 * sw], lineCap: 'round' }
    case 'dotted':
      return { strokeLineDash: [0, 3 * sw], lineCap: 'round' } // round caps → dots
    case 'solid':
    default:
      return { strokeLineDash: undefined, lineCap: 'butt' }
  }
}

/** Simple sharp diamond path (inscribed). */
function sharpDiamondPath(x0: number, y0: number, x1: number, y1: number): string {
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return [
    `M ${cx} ${y0}`, // top mid
    `L ${x1} ${cy}`, // right mid
    `L ${cx} ${y1}`, // bottom mid
    `L ${x0} ${cy}`, // left mid
    `Z`
  ].join(' ')
}

/**
 * Rounded diamond path (inscribed).
 * r is a visual corner radius in px. We trim each 45° edge by s = r * √2,
 * then connect the two trim points around each corner with a quadratic curve
 * using the corner vertex as the control point.
 */
function roundedDiamondPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number
): string {
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2

  // Diamond vertices (clockwise)
  const T = { x: cx,   y: y0 }
  const R = { x: x1,   y: cy }
  const B = { x: cx,   y: y1 }
  const L = { x: x0,   y: cy }

  // helper: move along segment A->B by distance s
  const along = (A: { x: number, y: number }, B: { x: number, y: number }, s: number) => {
    const dx = B.x - A.x
    const dy = B.y - A.y
    const len = Math.hypot(dx, dy) || 1
    const t = Math.max(0, Math.min(1, s / len))
    return { x: A.x + dx * t, y: A.y + dy * t }
  }

  // edge length (all are equal for a diamond)
  const edgeLen = Math.hypot(R.x - T.x, R.y - T.y)

  // convert axis radius r to along-edge trim distance s (45° edges)
  let s = r * Math.SQRT2
  const sMax = Math.max(0, edgeLen / 2 - 0.01)
  s = Math.max(0, Math.min(s, sMax))
  if (s <= 0.0001) {
    // fall back to sharp diamond
    return [
      `M ${cx} ${y0}`,
      `L ${x1} ${cy}`,
      `L ${cx} ${y1}`,
      `L ${x0} ${cy}`,
      `Z`
    ].join(' ')
  }

  // trim points near each corner on adjacent edges
  const T_R = along(T, R, s) // leaving T toward R
  const R_T = along(R, T, s) // approaching R from T
  const R_B = along(R, B, s)
  const B_R = along(B, R, s)
  const B_L = along(B, L, s)
  const L_B = along(L, B, s)
  const L_T = along(L, T, s)
  const T_L = along(T, L, s)

  // Sequence: start just after T on edge T->R, then:
  //  ... line to near R, Q around R, line to near B, Q around B, line to near L, Q around L,
  //  line to near T, Q around T back to start.
  return [
    `M ${T_R.x} ${T_R.y}`,
    `L ${R_T.x} ${R_T.y}`,
    `Q ${R.x} ${R.y}, ${R_B.x} ${R_B.y}`,

    `L ${B_R.x} ${B_R.y}`,
    `Q ${B.x} ${B.y}, ${B_L.x} ${B_L.y}`,

    `L ${L_B.x} ${L_B.y}`,
    `Q ${L.x} ${L.y}, ${L_T.x} ${L_T.y}`,

    `L ${T_L.x} ${T_L.y}`,
    `Q ${T.x} ${T.y}, ${T_R.x} ${T_R.y}`,
    `Z`
  ].join(' ')
}

/* =========================
   DIAMOND — inscribed, with rounded option
   ========================= */
export const RoughDiamond: React.FC<RoughDiamondProps> = ({
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
    const oversample = oversampleForZoom(effectiveZoom)

    // bleed for stroke + jitter
    const bleed = Math.ceil((strokeWidth ?? 1) / 2 + (roughness ?? 1.2) * 1.5 + 2)

    const paddedWidth = cssW + bleed * 2
    const paddedHeight = cssH + bleed * 2
    const baseScale = dpr * oversample * RENDER_SCALE_FACTOR
    const limiter = Math.min(
      1,
      MAX_RENDER_WIDTH / (paddedWidth * baseScale),
      MAX_RENDER_HEIGHT / (paddedHeight * baseScale)
    )
    const renderScale = baseScale * limiter

    const pixelW = Math.floor(paddedWidth * renderScale)
    const pixelH = Math.floor(paddedHeight * renderScale)
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
      dpr,
      renderScale
    }

    if (drawConfigEqual(lastConfigRef.current, config)) {
      return
    }

    const visibleStroke = stroke === 'transparent' && !fill ? '#222' : stroke

    const inset = (strokeWidth ?? 1) <= 1.5 ? Math.min(0.5, cssW / 4, cssH / 4) : 0
    const x0 = inset
    const y0 = inset
    const x1 = inset + Math.max(0, cssW - inset * 2)
    const y1 = inset + Math.max(0, cssH - inset * 2)

    const baseRadius = rounded === 'rounded-2xl' ? 16 : 0
    const pathData =
      baseRadius > 0
        ? roundedDiamondPath(x0, y0, x1, y1, baseRadius)
        : sharpDiamondPath(x0, y0, x1, y1)

    const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)
    const apparentSize = Math.max(cssW, cssH) * Math.min(1, effectiveZoom)
    const { curveStepCount, maxRandomnessOffset, hachureGap } = detailForSize(apparentSize)

    const cacheKey = serializeCacheKey([
      'diamond',
      rounded,
      roughness,
      visibleStroke,
      strokeStyle,
      strokeWidth,
      fill || '',
      fillStyle || '',
      seed,
      effectiveZoom,
      renderScale,
      cssW,
      cssH,
    ])

    const offscreen = getCachedCanvas(cacheKey, pixelW, pixelH, target => {
      const offCtx = target.getContext('2d')
      if (!offCtx) return

      offCtx.setTransform(1, 0, 0, 1, 0, 0)
      offCtx.clearRect(0, 0, target.width, target.height)
      offCtx.setTransform(renderScale, 0, 0, renderScale, 0, 0)
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

  return (
    <div ref={wrapperRef} className={clsx('relative', className || '')}>
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
