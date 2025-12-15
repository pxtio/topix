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
  const baseHeight = Math.max(minHeight, 50)
  const accentSize = Math.max(40, baseHeight * 0.9)
  const shapeProps = {
    roughness,
    fill: backgroundColor,
    fillStyle,
    stroke: strokeColor,
    strokeStyle,
    strokeWidth,
    seed
  }

  const renderLayeredRectangle = () => {
    const offsetX = Math.min(baseHeight * 0.08, 12)
    const offsetY = Math.min(baseHeight * 0.12, 16)
    return (
      <div className={baseWrapperClass} style={wrapperStyle}>
        <div
          className='absolute inset-0 pointer-events-none'
          style={{ transform: `translate(${offsetX}px, ${offsetY}px)`, filter: 'brightness(0.9)' }}
        >
          <RoughRect {...shapeProps} className='w-full h-full' rounded={rounded} />
        </div>
        <div className='relative w-full h-full'>
          <RoughRect {...shapeProps} className='w-full h-full' rounded={rounded}>
            {children}
          </RoughRect>
        </div>
      </div>
    )
  }

  const renderThoughtCloud = () => {
    const circleLeft = accentSize * 0.4
    const circleTop = -accentSize * 0.4
    return (
      <div className={baseWrapperClass} style={wrapperStyle}>
        <div
          className='absolute pointer-events-none'
          style={{ width: accentSize, height: accentSize, left: circleLeft, top: circleTop, zIndex: 5 }}
        >
          <RoughCircle {...shapeProps} className='w-full h-full' />
        </div>
        <div className='relative w-full h-full z-10'>
          <RoughRect {...shapeProps} className='w-full h-full' rounded='rounded-2xl'>
            {children}
          </RoughRect>
        </div>
        <div
          className='absolute pointer-events-none z-20'
          style={{
            left: circleLeft,
            top: circleTop + accentSize * 0.35,
            width: accentSize * 1,
            height: accentSize * 0.9,
            borderRadius: accentSize,
            backgroundColor: backgroundColor ?? '#fff',
            border: '1px solid transparent'
          }}
        />
      </div>
    )
  }

  const renderCapsule = () => {
    const circleSize = accentSize
    const overlap = circleSize * 0.1

    return (
      <div className={clsx(baseWrapperClass, 'flex items-center gap-0')} style={{ minHeight }}>
        <div className='relative shrink-0' style={{ width: circleSize, height: circleSize }}>
          <div className='absolute inset-0 translate-x-1 translate-y-1 pointer-events-none' style={{ filter: 'brightness(0.85)' }}>
            <RoughCircle {...shapeProps} className='w-full h-full' />
          </div>
          <div className='relative w-full h-full z-10 pointer-events-none'>
            <RoughCircle {...shapeProps} className='w-full h-full' />
          </div>
        </div>
        <div className='relative flex-1 h-full' style={{ marginLeft: overlap }}>
          <RoughRect {...shapeProps} className='w-full h-full' rounded='rounded-2xl'>
            {children}
          </RoughRect>
        </div>
      </div>
    )
  }

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
