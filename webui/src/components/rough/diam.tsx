import React, { useCallback, useEffect, useRef } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import { useViewport } from '@xyflow/react'
import clsx from 'clsx'
import type { StrokeStyle } from '@/features/board/types/style'

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

/** Map logical stroke style to dash pattern + desired canvas lineCap (set on ctx). */
function mapStrokeStyle(
  strokeStyle: StrokeStyle | undefined,
  strokeWidth: number | undefined
): { strokeLineDash?: number[], lineCap?: CanvasLineCap } {
  const sw = Math.max(0.5, strokeWidth ?? 1)
  switch (strokeStyle) {
    case 'dashed':
      return { strokeLineDash: [4 * sw, 2.5 * sw], lineCap: 'butt' }
    case 'dotted':
      return { strokeLineDash: [0, 2.2 * sw], lineCap: 'round' } // round caps → dots
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
  const { zoom = 1 } = useViewport()

  const draw = useCallback((wrapper: HTMLDivElement, canvas: HTMLCanvasElement) => {
    const rect = wrapper.getBoundingClientRect()
    const cssW = Math.max(1, wrapper.clientWidth || Math.floor(rect.width))
    const cssH = Math.max(1, wrapper.clientHeight || Math.floor(rect.height))
    if (cssW === 0 || cssH === 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const oversample = Math.max(1, zoom)

    // bleed for stroke + jitter
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

    // draw in CSS units
    ctx.setTransform(dpr * oversample, 0, 0, dpr * oversample, 0, 0)
    ctx.translate(bleed, bleed)

    const rc = new RoughCanvas(canvas)
    const visibleStroke = stroke === 'transparent' && !fill ? '#222' : stroke

    // hairline crispness without eating tiny shapes
    const inset = (strokeWidth ?? 1) <= 1.5 ? Math.min(0.5, cssW / 4, cssH / 4) : 0
    const x0 = inset
    const y0 = inset
    const x1 = inset + Math.max(0, cssW - inset * 2)
    const y1 = inset + Math.max(0, cssH - inset * 2)

    // radius choice (similar to rect): 16px "2xl", clamped by geometry
    const baseRadius = rounded === 'rounded-2xl' ? 16 : 0
    const pathData =
      baseRadius > 0
        ? roundedDiamondPath(x0, y0, x1, y1, baseRadius)
        : sharpDiamondPath(x0, y0, x1, y1)

    const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)

    const drawable = rc.generator.path(pathData, {
      roughness,
      stroke: visibleStroke,
      strokeWidth: strokeWidth ?? 1,
      fill,
      fillStyle,
      bowing: 2,
      curveStepCount: 24,
      maxRandomnessOffset: 1.5,
      seed: seed || 1337,
      strokeLineDash,
      strokeLineDashOffset: 0
    })

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