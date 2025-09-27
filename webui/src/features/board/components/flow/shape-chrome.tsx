import React from 'react'
import clsx from 'clsx'
import { RoughRect } from '@/components/rough/rect'
import { RoughCircle } from '@/components/rough/circ'
import { RoughDiamond } from '@/components/rough/diam'
import type { FillStyle, NodeType, StrokeStyle, StrokeWidth } from '../../types/style'

type ShapeChromeProps = {
  type: NodeType
  minHeight: number
  rounded?: 'none' | 'rounded-2xl'
  frameClass?: string
  textColor?: string
  backgroundColor?: string
  strokeColor?: string
  roughness?: number
  fillStyle?: FillStyle
  strokeStyle?: StrokeStyle
  strokeWidth?: StrokeWidth
  seed?: number
  className?: string
  children: React.ReactNode
}

export function ShapeChrome({
  type,
  minHeight,
  rounded = 'none',
  frameClass,
  textColor,
  backgroundColor,
  strokeColor,
  roughness,
  fillStyle,
  strokeStyle,
  strokeWidth,
  seed,
  className,
  children,
}: ShapeChromeProps) {
  if (type === 'sheet') {
    return (
      <div
        className={clsx('shadow-lg rounded-md border border-border', frameClass)}
        style={{ backgroundColor, color: textColor, minHeight }}
      >
        {children}
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div className={clsx('bg-transparent w-full h-full', className)} style={{ color: textColor }}>
        {children}
      </div>
    )
  }

  const commonProps = {
    roughness,
    fill: backgroundColor,
    fillStyle,
    stroke: strokeColor,
    strokeStyle,
    strokeWidth,
    seed,
    className: clsx('w-full h-full', className),
    style: { minHeight },
    children,
  }

  if (type === 'ellipse') return <RoughCircle {...commonProps} />
  if (type === 'diamond') return <RoughDiamond {...commonProps} rounded={rounded} />

  // default rect
  return <RoughRect {...commonProps} rounded={rounded} />
}
