import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import clsx from 'clsx'
import type { StrokeStyle } from '@/features/board/types/style'
import { getCachedCanvas, serializeCacheKey } from './cache'
import { useGraphStore } from '@/features/board/store/graph-store'

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

type SimplifiedTagOverlayProps = {
  stroke?: string
  strokeStyle?: StrokeStyle
  strokeWidth?: number
  fill?: string
  viewBoxWidth: number
  viewBoxHeight: number
}

const SimplifiedTagOverlay = memo(function SimplifiedTagOverlay({
  stroke,
  strokeStyle,
  strokeWidth,
  fill,
  viewBoxWidth,
  viewBoxHeight
}: SimplifiedTagOverlayProps) {
  const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)
  const dashArray = strokeLineDash ? strokeLineDash.join(' ') : undefined
  const viewBoxW = Math.max(1, viewBoxWidth)
  const viewBoxH = Math.max(1, viewBoxHeight)
  const notch = Math.min(viewBoxH * 0.45, viewBoxW * 0.3)
  const radius = Math.min(viewBoxH / 2, viewBoxW / 4, 18)
  const pathData = tagPath(viewBoxW, viewBoxH, notch, radius)

  return (
    <svg
      className='absolute pointer-events-none m-0.75'
      style={{
        inset: 0,
        zIndex: 10,
        overflow: 'visible',
        width: 'calc(100% - 0.375rem)',
        height: 'calc(100% - 0.375rem)',
      }}
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      preserveAspectRatio="none"
    >
      <path
        d={pathData}
        fill={fill || 'transparent'}
        stroke={stroke || 'transparent'}
        strokeWidth={strokeWidth ?? 1}
        strokeDasharray={dashArray}
        strokeLinecap={lineCap}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
})

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
  if (maxSide >= 800) return { curveStepCount: 3, maxRandomnessOffset: 0.9, hachureGap: 9 }
  if (maxSide >= 400) return { curveStepCount: 4, maxRandomnessOffset: 1.1, hachureGap: 7 }
  return { curveStepCount: 5, maxRandomnessOffset: 1.3, hachureGap: 5 }
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

// Single-path tag: notch (triangle-ish) leading into rounded body.
function tagPath(
  w: number,
  h: number,
  notch: number,
  radius: number,
  tipRadius: number = 6
): string {
  const tipX = 0
  const tipY = h / 2

  const bodyLeft = Math.max(0, Math.min(notch, w))
  const right = w
  const bottom = h

  const rBody = Math.min(radius, h / 2, (right - bodyLeft) / 2)
  const rJoin = Math.min(radius, h * 0.45, bodyLeft * 0.8)

  if (bodyLeft <= 0.001) {
    const r = Math.min(radius, h / 2, w / 2)
    return [
      `M ${r} 0`,
      `L ${w - r} 0`,
      `Q ${w} 0 ${w} ${r}`,
      `L ${w} ${h - r}`,
      `Q ${w} ${h} ${w - r} ${h}`,
      `L ${r} ${h}`,
      `Q 0 ${h} 0 ${h - r}`,
      `L 0 ${r}`,
      `Q 0 0 ${r} 0`,
      `Z`,
    ].join(" ")
  }

  const pTop = { x: bodyLeft, y: rJoin }
  const pBot = { x: bodyLeft, y: bottom - rJoin }

  const unit = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    return { x: dx / len, y: dy / len, len }
  }

  // directions from join points -> tip
  const dTop = unit(pTop.x, pTop.y, tipX, tipY)
  const dBot = unit(pBot.x, pBot.y, tipX, tipY)

  // how much we can round without overshooting the diagonals
  const maxTipRound = Math.min(dTop.len, dBot.len) * 0.49
  const t = Math.max(0, Math.min(tipRadius, maxTipRound))

  // points on the diagonals, "t" away from the tip
  const tipEnter = { x: tipX - dBot.x * t, y: tipY - dBot.y * t } // coming from bottom side
  const tipExit = { x: tipX - dTop.x * t, y: tipY - dTop.y * t }  // leaving to top side

  const k = rJoin * 0.65
  const topStart = { x: bodyLeft + rBody, y: 0 }
  const botEnd = { x: bodyLeft + rBody, y: bottom }

  return [
    // top edge
    `M ${topStart.x} ${topStart.y}`,
    `L ${right - rBody} 0`,
    `Q ${right} 0 ${right} ${rBody}`,

    // right edge
    `L ${right} ${bottom - rBody}`,
    `Q ${right} ${bottom} ${right - rBody} ${bottom}`,

    // bottom edge back left
    `L ${botEnd.x} ${botEnd.y}`,

    // bottom edge -> bottom join (smooth)
    `C ${botEnd.x - k} ${bottom} ${pBot.x - dBot.x * k} ${pBot.y - dBot.y * k} ${pBot.x} ${pBot.y}`,

    // bottom join -> (near) tip
    `L ${t > 0 ? tipEnter.x : tipX} ${t > 0 ? tipEnter.y : tipY}`,

    // rounded tip (if t>0) using a quadratic curve with control at the true tip
    ...(t > 0 ? [`Q ${tipX} ${tipY} ${tipExit.x} ${tipExit.y}`] : []),

    // (near) tip -> top join
    `L ${pTop.x} ${pTop.y}`,

    // top join -> top edge (smooth)
    `C ${pTop.x + (-dTop.x) * k} ${pTop.y + (-dTop.y) * k} ${topStart.x - k} 0 ${topStart.x} 0`,

    `Z`,
  ].join(" ")
}

export const RoughTag: React.FC<RoughShapeProps> = ({
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
  const viewportZoom = useGraphStore(state => state.zoom ?? 1)
  const isMoving = useGraphStore(state => state.isMoving)
  const isResizing = useGraphStore(state => state.isResizingNode)
  const effectiveZoom = quantizeZoom(viewportZoom || 1)
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })

  const draw = useCallback((wrapper: HTMLDivElement, canvas: HTMLCanvasElement) => {
    if (isMoving && !isResizing) return
    const rect = wrapper.getBoundingClientRect()
    const cssW = Math.max(1, wrapper.clientWidth || Math.floor(rect.width))
    const cssH = Math.max(1, wrapper.clientHeight || Math.floor(rect.height))
    if (cssW === 0 || cssH === 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const oversample = oversampleForZoom(effectiveZoom)

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
    const notch = Math.min(cssH * 0.45, cssW * 0.3)
    const radius = Math.min(cssH / 2, cssW / 4, 18)
    const pathData = tagPath(cssW, cssH, notch, radius)

    const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)
    const apparentSize = Math.max(cssW, cssH) * Math.min(1, effectiveZoom)
    const { curveStepCount, maxRandomnessOffset, hachureGap } = detailForSize(apparentSize)

    const cacheKey = serializeCacheKey([
      'tag',
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
  }, [roughness, stroke, strokeWidth, fill, fillStyle, effectiveZoom, seed, strokeStyle, isMoving, isResizing])

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

    const handleResize = () => {
      const width = wrapper.clientWidth
      const height = wrapper.clientHeight
      setOverlaySize(prev => (
        prev.width === width && prev.height === height ? prev : { width, height }
      ))
      scheduleRedraw()
    }
    const ro = new ResizeObserver(handleResize)
    ro.observe(wrapper)

    handleResize()

    return () => {
      ro.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [scheduleRedraw])

  const mainDivClass = clsx('relative', className || '')
  const isSimplified = isMoving && !isResizing
  const overlayViewBox = useMemo(() => {
    const inset = 6
    return {
      width: Math.max(1, overlaySize.width - inset),
      height: Math.max(1, overlaySize.height - inset),
    }
  }, [overlaySize.height, overlaySize.width])

  return (
    <div ref={wrapperRef} className={mainDivClass}>
      {isSimplified && (
        <SimplifiedTagOverlay
          stroke={stroke}
          strokeStyle={strokeStyle}
          strokeWidth={strokeWidth}
          fill={fill}
          viewBoxWidth={overlayViewBox.width}
          viewBoxHeight={overlayViewBox.height}
        />
      )}
      <canvas
        ref={canvasRef}
        className='absolute inset-0 w-full h-full pointer-events-none'
        style={{ zIndex: 10, background: 'transparent', opacity: isSimplified ? 0 : 1 }}
      />
      <div className='relative z-20 w-full h-full'>
        {children}
      </div>
    </div>
  )
}
