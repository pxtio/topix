import React, { memo } from 'react'
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

export const ShapeChrome = memo(({
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
}: ShapeChromeProps) => {
  const wrapperStyle = { minHeight }

  if (type === 'sheet') {
    return (
      <div
        className={clsx('rounded-xl border border-border', frameClass, className)}
        style={{ backgroundColor, color: textColor, borderColor: strokeColor, ...wrapperStyle }}
      >
        {children}
      </div>
    )
  }

  if (type === "image" || type === "icon") {
    return (
      <div
        className={clsx('w-full h-full transparent', frameClass, className)}
        style={{ color: textColor, ...wrapperStyle }}
      >
        {children}
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div className={clsx('bg-transparent w-full h-full', className)} style={{ color: textColor, ...wrapperStyle }}>
        {children}
      </div>
    )
  }

  const baseWrapperClass = clsx('relative w-full h-full', frameClass, className)
  const shapeProps = {
    roughness,
    fill: backgroundColor,
    fillStyle,
    stroke: strokeColor,
    strokeStyle,
    strokeWidth,
    seed
  }

  const renderLayeredRectangle = () => (
    <div className={baseWrapperClass} style={wrapperStyle}>
      <div className='absolute inset-0 translate-x-[6px] translate-y-[8px] pointer-events-none' style={{ filter: 'brightness(0.9)' }}>
        <RoughRect {...shapeProps} className='w-full h-full' rounded={rounded} />
      </div>
      <div className='relative w-full h-full'>
        <RoughRect {...shapeProps} className='w-full h-full' rounded={rounded}>
          {children}
        </RoughRect>
      </div>
    </div>
  )

  const renderThoughtCloud = () => (
    <div className={baseWrapperClass} style={wrapperStyle}>
      <div className='absolute left-[10%] right-[55%] -top-[30%] h-[60%] pointer-events-none'>
        <RoughCircle {...shapeProps} className='w-full h-full' />
      </div>
      <div className='relative w-full h-full'>
        <RoughRect {...shapeProps} className='w-full h-full' rounded='rounded-2xl'>
          {children}
        </RoughRect>
      </div>
    </div>
  )

  const renderCapsule = () => (
    <div className={clsx(baseWrapperClass, 'pl-10')} style={wrapperStyle}>
      <div className='absolute left-0 top-1/2 -translate-y-1/2 h-[60%] aspect-square -translate-x-4 pointer-events-none'>
        <div className='absolute inset-0 translate-x-1 translate-y-1' style={{ filter: 'brightness(0.85)' }}>
          <RoughCircle {...shapeProps} className='w-full h-full' />
        </div>
        <RoughCircle {...shapeProps} className='w-full h-full' />
      </div>
      <div className='relative w-full h-full'>
        <RoughRect {...shapeProps} className='w-full h-full' rounded='rounded-2xl'>
          {children}
        </RoughRect>
      </div>
    </div>
  )

  if (type === 'layered-rectangle') {
    return renderLayeredRectangle()
  }

  if (type === 'thought-cloud') {
    return renderThoughtCloud()
  }

  if (type === 'capsule') {
    return renderCapsule()
  }

  if (type === 'ellipse') {
    return (
      <div className={baseWrapperClass} style={wrapperStyle}>
        <RoughCircle {...shapeProps} className='w-full h-full'>
          {children}
        </RoughCircle>
      </div>
    )
  }

  if (type === 'diamond') {
    return (
      <div className={baseWrapperClass} style={wrapperStyle}>
        <RoughDiamond {...shapeProps} className='w-full h-full' rounded={rounded}>
          {children}
        </RoughDiamond>
      </div>
    )
  }

  // default rect
  return (
    <div className={baseWrapperClass} style={wrapperStyle}>
      <RoughRect {...shapeProps} className='w-full h-full' rounded={rounded}>
        {children}
      </RoughRect>
    </div>
  )
})
