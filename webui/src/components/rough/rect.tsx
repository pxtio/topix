import React, { useEffect, useRef, useCallback } from 'react'
import { RoughCanvas } from 'roughjs/bin/canvas'
import { type Options as RoughOptions } from 'roughjs/bin/core'


/**
 * RoughRect is a React component that draws a rough rectangle with optional rounded corners
 * and allows for children to be rendered inside it. It uses the Rough.js library to create
 * the rough drawing effect.
 *
 * @param {Object} props - The properties for the RoughRect component.
 * @param {React.ReactNode} props.children - The content to render inside the rectangle.
 * @param {'none' | 'rounded-2xl'} [props.rounded='none'] - The rounding style for the rectangle corners.
 * @param {number} [props.roughness=1.5] - The roughness of the drawing.
 * @param {string} [props.stroke='black'] - The stroke color of the rectangle.
 * @param {number} [props.strokeWidth=2] - The width of the stroke.
 * @param {string} [props.fill] - The fill color of the rectangle.
 * @param {RoughOptions['fillStyle']} [props.fillStyle='hachure'] - The fill style for the rectangle.
 */
export type RoughRectProps = {
  children: React.ReactNode
  rounded?: 'none' | 'rounded-2xl'
  roughness?: number
  stroke?: string
  strokeWidth?: number
  fill?: string
  fillStyle?: RoughOptions['fillStyle']
}


/**
 * RoughRect is a React component that draws a rough rectangle with optional rounded corners
 * and allows for children to be rendered inside it. It uses the Rough.js library to create
 * the rough drawing effect.
 */
export const RoughRect: React.FC<RoughRectProps> = ({
  children,
  rounded = 'none',
  roughness = 0.5,
  stroke = 'transparent',
  strokeWidth = 1,
  fill,
  fillStyle = 'solid',
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback((wrapper: HTMLDivElement, canvas: HTMLCanvasElement) => {
    const { width, height } = wrapper.getBoundingClientRect()
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)

    const rc = new RoughCanvas(canvas)
    const radius = rounded === 'rounded-2xl' ? 16 : 0

    const pathData = roundedRectPath(0, 0, width, height, radius)
    const drawable = rc.generator.path(pathData, {
      roughness,
      stroke,
      strokeWidth,
      fill,
      fillStyle,
    })

    rc.draw(drawable)
  }, [rounded, roughness, stroke, strokeWidth, fill, fillStyle])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const resizeObserver = new ResizeObserver(() => {
      draw(wrapper, canvas)
    })

    resizeObserver.observe(wrapper)
    draw(wrapper, canvas)

    return () => {
      resizeObserver.disconnect()
    }
  }, [draw])

  return (
    <div ref={wrapperRef} className="relative">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      />
      <div className="relative z-20">{children}</div>
    </div>
  )
}

function roundedRectPath(x: number, y: number, width: number, height: number, r: number): string {
  return `
    M${x + r},${y}
    h${width - 2 * r}
    a${r},${r} 0 0 1 ${r},${r}
    v${height - 2 * r}
    a${r},${r} 0 0 1 -${r},${r}
    h-${width - 2 * r}
    a${r},${r} 0 0 1 -${r},-${r}
    v-${height - 2 * r}
    a${r},${r} 0 0 1 ${r},-${r}
    z
  `.trim()
}