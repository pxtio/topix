import React, { memo, useCallback, useEffect, useRef } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import clsx from 'clsx'
import type { StrokeStyle } from '@/features/board/types/style'
import { getCachedCanvas, serializeCacheKey } from './cache'
import { useGraphStore } from '@/features/board/store/graph-store'

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
  renderScale: number
}

type SimplifiedRectOverlayProps = {
  rounded: RoundedClass
  fill?: string
  stroke?: string
  strokeStyle?: StrokeStyle
  strokeWidth?: number
  visualInset: number
}

const SimplifiedRectOverlay = memo(function SimplifiedRectOverlay({
  rounded,
  fill,
  stroke,
  strokeStyle,
  strokeWidth,
  visualInset
}: SimplifiedRectOverlayProps) {
  const roundedClass = rounded === 'rounded-2xl' ? 'rounded-[14px]' : 'rounded-none'
  const hasStroke = stroke && stroke !== 'transparent' && (strokeWidth ?? 1) > 0
  const useSvgDash = hasStroke && (strokeStyle === 'dashed' || strokeStyle === 'dotted')
  const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)
  const dashArray = strokeLineDash ? strokeLineDash.join(' ') : undefined
  const borderInset = Math.max(0, visualInset)
  const halfStroke = (strokeWidth ?? 1) / 2
  const sizeCalc = `calc(100% - ${(borderInset + halfStroke) * 2}px)`
  const radius = rounded === 'rounded-2xl' ? 16 : 0

  if (useSvgDash) {
    return (
      <svg
        className='absolute pointer-events-none'
        style={{
          inset: visualInset,
          zIndex: 10,
          overflow: 'visible',
          width: 'calc(100% - 0.375rem)',
          height: 'calc(100% - 0.375rem)',
        }}
      >
        <rect
          x={borderInset + halfStroke}
          y={borderInset + halfStroke}
          width={sizeCalc}
          height={sizeCalc}
          rx={radius}
          ry={radius}
          fill={fill || 'transparent'}
          stroke={stroke || 'transparent'}
          strokeWidth={strokeWidth ?? 1}
          strokeDasharray={dashArray}
          strokeLinecap={lineCap}
        />
      </svg>
    )
  }

  return (
    <div
      className={clsx('absolute pointer-events-none m-0.75', roundedClass)}
      style={{
        inset: visualInset,
        background: fill || 'transparent',
        border: `${strokeWidth ?? 1}px solid ${stroke || 'transparent'}`,
        borderStyle: strokeStyle === 'dashed' ? 'dashed' : strokeStyle === 'dotted' ? 'dotted' : 'solid',
        zIndex: 10,
      }}
    />
  )
})

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
  if (maxSide >= 800) return { curveStepCount: 3, maxRandomnessOffset: 0.9, hachureGap: 9 }
  if (maxSide >= 400) return { curveStepCount: 4, maxRandomnessOffset: 1.1, hachureGap: 7 }
  return { curveStepCount: 5, maxRandomnessOffset: 1.3, hachureGap: 5 }
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastConfigRef = useRef<DrawConfig | null>(null)
  const rafRef = useRef<number | null>(null)
  const viewportZoom = useGraphStore(state => state.zoom ?? 1)
  const isMoving = useGraphStore(state => state.isMoving)
  const isResizing = useGraphStore(state => state.isResizingNode)
  const effectiveZoom = quantizeZoom(viewportZoom || 1)

  const draw = useCallback((wrapper: HTMLDivElement, canvas: HTMLCanvasElement) => {
    const rect = wrapper.getBoundingClientRect()
    const cssW = Math.max(1, wrapper.clientWidth || Math.floor(rect.width))
    const cssH = Math.max(1, wrapper.clientHeight || Math.floor(rect.height))
    if (cssW === 0 || cssH === 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

    // oversample backing store for zoom-in, clamped to avoid runaway buffers
    const oversample = oversampleForZoom(effectiveZoom)

    const effectiveStrokeWidth = stroke === 'transparent' ? 0 : (strokeWidth ?? 1)
    // add a bleed in CSS units (display px), enough for stroke + jitter
    const bleed = Math.ceil(effectiveStrokeWidth / 2 + (roughness ?? 1.2) * 1.5 + 2)

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
      strokeWidth: effectiveStrokeWidth,
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

    // hairline crispness without eating tiny boxes; include half stroke so outer edge aligns
    const insetBase = Math.min(0.5, cssW / 4, cssH / 4)
    const inset = insetBase + effectiveStrokeWidth / 2
    const w = Math.max(0, cssW - inset * 2)
    const h = Math.max(0, cssH - inset * 2)

    const baseRadius = rounded === 'rounded-2xl' ? 16 : 0
    const radius = Math.max(0, Math.min(baseRadius, w / 2, h / 2))

    const pathData = radius > 0
      ? excalidrawRoundedRectPath(inset, inset, w, h, radius)
      : rectPath(inset, inset, w, h)

    const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, effectiveStrokeWidth)
    const apparentSize = Math.max(cssW, cssH) * Math.min(1, effectiveZoom)
    const { curveStepCount, maxRandomnessOffset, hachureGap } = detailForSize(apparentSize)

    const cacheKey = serializeCacheKey([
      'rect',
      rounded,
      roughness,
      visibleStroke,
      strokeStyle,
      effectiveStrokeWidth,
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
      const strokeInset = effectiveStrokeWidth / 2
      offCtx.translate(bleed - strokeInset, bleed - strokeInset)

      const rc = new RoughCanvas(target)
      const drawable = rc.generator.path(pathData, {
        roughness,
        stroke: visibleStroke,
        strokeWidth: effectiveStrokeWidth,
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
    if (isMoving) return
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const wrapper = wrapperRef.current
      const canvas = canvasRef.current
      if (wrapper && canvas) {
        draw(wrapper, canvas)
      }
    })
  }, [draw, isMoving])

  useEffect(() => {
    if (isMoving) return
    const handleResize = () => scheduleRedraw()
    resizeObserverRef.current = new ResizeObserver(handleResize)

    const wrapper = wrapperRef.current
    if (wrapper) {
      resizeObserverRef.current.observe(wrapper)
      scheduleRedraw()
    }

    return () => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isMoving, scheduleRedraw])

  const setWrapperRef = useCallback((node: HTMLDivElement | null) => {
    if (wrapperRef.current === node) return
    wrapperRef.current = node
    if (!resizeObserverRef.current || isMoving) return
    resizeObserverRef.current.disconnect()
    if (node) {
      resizeObserverRef.current.observe(node)
      scheduleRedraw()
    }
  }, [isMoving, scheduleRedraw])

  const isSimplified = isMoving && !isResizing

  useEffect(() => {
    if (isSimplified) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }
    lastConfigRef.current = null
    scheduleRedraw()
  }, [isSimplified, scheduleRedraw])

  const mainDivClass = clsx('relative', className || '')
  const hairlineInset = (strokeWidth ?? 1) <= 1.5 ? 0.5 : 0
  const baseInset = Math.max(0, (strokeWidth ?? 1) / 2)
  const visualInset = (stroke === 'transparent' || strokeWidth === 0)
    ? hairlineInset
    : hairlineInset + baseInset

  if (isSimplified) {
    return (
      <div className={mainDivClass}>
        <SimplifiedRectOverlay
          rounded={rounded}
          fill={fill}
          stroke={stroke}
          strokeStyle={strokeStyle}
          strokeWidth={strokeWidth}
          visualInset={visualInset}
        />
        <div className='relative z-20 w-full h-full'>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div ref={setWrapperRef} className={mainDivClass}>
      <canvas
        ref={canvasRef}
        className='absolute pointer-events-none'
        style={{ inset: visualInset, zIndex: 10, background: 'transparent' }}
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
