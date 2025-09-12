import React, { useCallback, useEffect, useRef } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import { useViewport } from '@xyflow/react'
import clsx from 'clsx'
import type { StrokeStyle } from '@/features/board/types/style'

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
        strokeLineDash: [4 * sw, 2.5 * sw],
        lineCap: 'butt'
      }
    case 'dotted':
      // Round caps + [0, gap] yields pleasant dots
      return {
        strokeLineDash: [0, 2.2 * sw],
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
  const { zoom = 1 } = useViewport()

  const draw = useCallback((wrapper: HTMLDivElement, canvas: HTMLCanvasElement) => {
    const rect = wrapper.getBoundingClientRect()
    const cssW = Math.max(1, wrapper.clientWidth || Math.floor(rect.width))
    const cssH = Math.max(1, wrapper.clientHeight || Math.floor(rect.height))
    if (cssW === 0 || cssH === 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

    // oversample backing store for zoom-in, never below 1 on zoom-out
    const oversample = Math.max(1, zoom)

    // add a bleed in CSS units (display px), enough for stroke + jitter
    const bleed = Math.ceil((strokeWidth ?? 1) / 2 + (roughness ?? 1.2) * 1.5 + 2)

    const pixelW = Math.floor((cssW + bleed * 2) * dpr * oversample)
    const pixelH = Math.floor((cssH + bleed * 2) * dpr * oversample)
    if (canvas.width !== pixelW) canvas.width = pixelW
    if (canvas.height !== pixelH) canvas.height = pixelH

    canvas.style.width = cssW + 'px'
    canvas.style.height = cssH + 'px'

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // clear in device pixels
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // draw in CSS units scaled by dpr*oversample so the path fills the buffer
    ctx.setTransform(dpr * oversample, 0, 0, dpr * oversample, 0, 0)
    ctx.translate(bleed, bleed)

    const rc = new RoughCanvas(canvas)

    // ensure visible if no fill and stroke was 'transparent'
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

    // stroke style (solid / dashed / dotted)
    const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)

    const drawable = rc.generator.path(pathData, {
      roughness,
      stroke: visibleStroke,
      strokeWidth: strokeWidth ?? 1,
      fill,
      fillStyle,
      fillWeight: 1,
      bowing: 2,
      curveStepCount: 9,
      maxRandomnessOffset: 1.5,
      seed: seed || 1337,
      strokeLineDash,
      strokeLineDashOffset: 0,
      dashOffset: 8,
      dashGap: 16,
      hachureGap: 5,
      disableMultiStrokeFill: true
    })

    // Apply desired lineCap directly on the canvas context (RoughJS Options lacks this key)
    ctx.save()
    if (lineCap) ctx.lineCap = lineCap
    rc.draw(drawable)
    ctx.restore()
  }, [rounded, roughness, stroke, strokeWidth, fill, fillStyle, zoom, seed, strokeStyle])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const redraw = () => draw(wrapper, canvas)

    const ro = new ResizeObserver(redraw)
    ro.observe(wrapper)

    window.addEventListener('resize', redraw)

    redraw()

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', redraw)
    }
  }, [draw])

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