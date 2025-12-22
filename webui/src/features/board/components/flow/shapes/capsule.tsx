import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughCircle } from '@/components/rough/circ'
import { RoughRect } from '@/components/rough/rect'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type CapsuleProps = {
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

export const CapsuleShape = memo(({
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
}: CapsuleProps) => {
  const baseHeight = Math.max(minHeight, 50)
  const accentSize = Math.min(80, Math.max(45, baseHeight * 0.7))
  const overlap = accentSize * 0.1

  const circleProps = {
    roughness,
    fill,
    fillStyle,
    stroke,
    strokeStyle,
    strokeWidth,
    seed
  }

  return (
    <div className={clsx(wrapperClass, 'flex items-center gap-0')} style={{ ...wrapperStyle, minHeight }}>
      <div className='relative shrink-0' style={{ width: accentSize, height: accentSize }}>
        <div className='absolute inset-0 translate-x-1 translate-y-1 pointer-events-none' style={{ filter: 'brightness(0.85)' }}>
          <RoughCircle {...circleProps} className='w-full h-full' />
        </div>
        <div className='relative w-full h-full z-10 pointer-events-none'>
          <RoughCircle {...circleProps} className='w-full h-full' />
        </div>
      </div>
      <div className='relative flex-1 h-full' style={{ marginLeft: overlap }}>
        <RoughRect {...circleProps} className='w-full h-full' rounded='rounded-2xl'>
          {children}
        </RoughRect>
      </div>
    </div>
  )
})
