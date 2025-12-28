import React, { memo } from 'react'
import clsx from 'clsx'
import { RoughRect } from '@/components/rough/rect'
import { RoughCircle } from '@/components/rough/circ'
import { RoughDiamond } from '@/components/rough/diam'
import { LayeredRectangle } from './shapes/layered-rectangle'
import { LayeredDiamond } from './shapes/layered-diamond'
import { LayeredCircle } from './shapes/layered-circle'
import { TagShape } from './shapes/tag-shape'
import { ThoughtCloud } from './shapes/thought-cloud'
import { CapsuleShape } from './shapes/capsule'
import { SoftDiamond } from './shapes/soft-diamond'
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
        className={clsx('rounded-none border-2 border-foreground/30 bg-background overflow-hidden', frameClass, className)}
        style={{ backgroundColor}}
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

  if (type === 'layered-rectangle') {
    return (
      <LayeredRectangle
        minHeight={minHeight}
        rounded={rounded}
        wrapperClass={baseWrapperClass}
        wrapperStyle={wrapperStyle}
        {...shapeProps}
      >
        {children}
      </LayeredRectangle>
    )
  }

  if (type === 'thought-cloud') {
    return (
      <ThoughtCloud
        minHeight={minHeight}
        wrapperClass={baseWrapperClass}
        wrapperStyle={wrapperStyle}
        backgroundColor={backgroundColor}
        {...shapeProps}
      >
        {children}
      </ThoughtCloud>
    )
  }

  if (type === 'capsule') {
    return (
      <CapsuleShape
        minHeight={minHeight}
        wrapperClass={baseWrapperClass}
        wrapperStyle={wrapperStyle}
        {...shapeProps}
      >
        {children}
      </CapsuleShape>
    )
  }

  if (type === 'soft-diamond') {
    return (
      <SoftDiamond
        wrapperClass={baseWrapperClass}
        wrapperStyle={wrapperStyle}
        {...shapeProps}
      >
        {children}
      </SoftDiamond>
    )
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

  if (type === 'layered-diamond') {
    return (
      <LayeredDiamond
        minHeight={minHeight}
        wrapperClass={baseWrapperClass}
        wrapperStyle={wrapperStyle}
        {...shapeProps}
      >
        {children}
      </LayeredDiamond>
    )
  }

  if (type === 'layered-circle') {
    return (
      <LayeredCircle
        minHeight={minHeight}
        wrapperClass={baseWrapperClass}
        wrapperStyle={wrapperStyle}
        {...shapeProps}
      >
        {children}
      </LayeredCircle>
    )
  }

  if (type === 'tag') {
    return (
      <TagShape
        minHeight={minHeight}
        wrapperClass={baseWrapperClass}
        wrapperStyle={wrapperStyle}
        {...shapeProps}
      >
        {children}
      </TagShape>
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
