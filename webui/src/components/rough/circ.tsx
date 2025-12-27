import React, { useCallback, useEffect, useRef } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import { useViewport } from '@xyflow/react'
import clsx from 'clsx'
import type { StrokeStyle } from '@/features/board/types/style'
import { getCachedCanvas, serializeCacheKey } from './cache'

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

type DrawConfig = {
  cssW: number
  cssH: number
  zoom: number
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

/** Same helper you already use elsewhere */
function mapStrokeStyle(
  strokeStyle: StrokeStyle | undefined,
  strokeWidth: number | undefined
): { strokeLineDash?: number[], lineCap?: CanvasLineCap } {
  const sw = Math.max(0.5, strokeWidth ?? 1)
  switch (strokeStyle) {
    case 'dashed':
      return { strokeLineDash: [5.5 * sw, 4 * sw], lineCap: 'round' }
    case 'dotted':
      return { strokeLineDash: [0, 3 * sw], lineCap: 'round' }
    case 'solid':
    default:
      return { strokeLineDash: undefined, lineCap: 'butt' }
  }
}

/* =========================
   ELLIPSE — inscribed
   ========================= */
export const RoughCircle: React.FC<RoughShapeProps> = ({
  children,
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

    // bleed so jitter/stroke won't clip
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

    const innerW = cssW
    const innerH = cssH
    const cx = innerW / 2
    const cy = innerH / 2
    const ellipseW = innerW
    const ellipseH = innerH

    const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)
    const apparentSize = Math.max(cssW, cssH) * Math.min(1, effectiveZoom)
    const { curveStepCount, maxRandomnessOffset, hachureGap } = detailForSize(apparentSize)

    const cacheKey = serializeCacheKey([
      'ellipse',
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
      const drawable = rc.generator.ellipse(cx, cy, ellipseW, ellipseH, {
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
  }, [roughness, stroke, strokeWidth, fill, fillStyle, effectiveZoom, seed, strokeStyle])

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
