import React, { useCallback, useEffect, useRef } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import { useViewport } from '@xyflow/react'
import clsx from 'clsx'
import type { StrokeStyle } from '@/features/board/types/style'

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

/** Same helper you already use elsewhere */
function mapStrokeStyle(
  strokeStyle: StrokeStyle | undefined,
  strokeWidth: number | undefined
): { strokeLineDash?: number[], lineCap?: CanvasLineCap } {
  const sw = Math.max(0.5, strokeWidth ?? 1)
  switch (strokeStyle) {
    case 'dashed':
      return { strokeLineDash: [4 * sw, 2.5 * sw], lineCap: 'butt' }
    case 'dotted':
      return { strokeLineDash: [0, 2.2 * sw], lineCap: 'round' }
    case 'solid':
    default:
      return { strokeLineDash: undefined, lineCap: 'butt' }
  }
}

/* =========================
   ELLIPSE — inscribed (“nội tiếp”)
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
  const { zoom = 1 } = useViewport()

  const draw = useCallback((wrapper: HTMLDivElement, canvas: HTMLCanvasElement) => {
    const rect = wrapper.getBoundingClientRect()
    const cssW = Math.max(1, wrapper.clientWidth || Math.floor(rect.width))
    const cssH = Math.max(1, wrapper.clientHeight || Math.floor(rect.height))
    if (cssW === 0 || cssH === 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const oversample = Math.max(1, zoom)

    // bleed so jitter/stroke won't clip
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

    // --- true inscribed ellipse: touches all four sides of wrapper ---
    const innerW = cssW
    const innerH = cssH
    const cx = innerW / 2
    const cy = innerH / 2
    const ellipseW = innerW      // diameter horizontally
    const ellipseH = innerH      // diameter vertically

    const { strokeLineDash, lineCap } = mapStrokeStyle(strokeStyle, strokeWidth)

    const drawable = rc.generator.ellipse(cx, cy, ellipseW, ellipseH, {
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
  }, [roughness, stroke, strokeWidth, fill, fillStyle, zoom, seed, strokeStyle])

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
