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
    a.dpr === b.dpr
  )
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
  const roughRef = useRef<{ canvas: HTMLCanvasElement, instance: RoughCanvas } | null>(null)
  const lastConfigRef = useRef<DrawConfig | null>(null)
  const rafRef = useRef<number | null>(null)
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

    const config: DrawConfig = {
      cssW,
      cssH,
      zoom,
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

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // clear in device pixels
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // draw in CSS units
    ctx.setTransform(dpr * oversample, 0, 0, dpr * oversample, 0, 0)
    ctx.translate(bleed, bleed)

    if (!roughRef.current || roughRef.current.canvas !== canvas) {
      roughRef.current = { canvas, instance: new RoughCanvas(canvas) }
    }
    const rc = roughRef.current.instance
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
      disableMultiStroke: true,
      disableMultiStrokeFill: true,
      preserveVertices: true,
    })

    ctx.save()
    if (lineCap) ctx.lineCap = lineCap
    ctx.lineJoin = 'round'
    rc.draw(drawable)
    ctx.restore()

    lastConfigRef.current = config
  }, [roughness, stroke, strokeWidth, fill, fillStyle, zoom, seed, strokeStyle])

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
