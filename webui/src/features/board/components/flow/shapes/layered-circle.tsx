import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughCircle } from '@/components/rough/circ'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type LayeredCircleProps = {
  minHeight: number
  wrapperClass: string
  wrapperStyle: CSSProperties
  roughness?: number
  fill?: string
  fillStyle?: FillStyle
  stroke?: string
  strokeStyle?: StrokeStyle
  strokeWidth?: StrokeWidth
  seed?: number
  children: ReactNode
}

export const LayeredCircle = memo(({
  minHeight,
  wrapperClass,
  wrapperStyle,
  roughness,
  fill,
  fillStyle,
  stroke,
  strokeStyle,
  strokeWidth,
  seed,
  children
}: LayeredCircleProps) => {
  const baseSize = Math.max(minHeight, 50)
  const offset = Math.min(baseSize * 0.12, 16)

  const commonProps = {
    roughness,
    fill,
    fillStyle,
    stroke,
    strokeStyle,
    strokeWidth,
    seed
  }

  return (
    <div className={clsx(wrapperClass)} style={wrapperStyle}>
      <div
        className='absolute inset-0 pointer-events-none'
        style={{ transform: `translate(${offset}px, ${offset}px)`, filter: 'brightness(0.9)' }}
      >
        <RoughCircle {...commonProps} className='w-full h-full' />
      </div>
      <div className='relative w-full h-full'>
        <RoughCircle {...commonProps} className='w-full h-full'>
          {children}
        </RoughCircle>
      </div>
    </div>
  )
})
