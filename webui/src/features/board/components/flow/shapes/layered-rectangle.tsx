import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughRect } from '@/components/rough/rect'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type LayeredRectangleProps = {
  rounded: 'none' | 'rounded-2xl'
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

export const LayeredRectangle = memo(({
  rounded,
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
}: LayeredRectangleProps) => {
  const offsetX = 12
  const offsetY = 12

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
        style={{ transform: `translate(${offsetX}px, ${offsetY}px)`, filter: 'brightness(0.75)' }}
      >
        <RoughRect {...commonProps} className='w-full h-full' rounded={rounded} />
      </div>
      <div className='relative w-full h-full'>
        <RoughRect {...commonProps} className='w-full h-full' rounded={rounded}>
          {children}
        </RoughRect>
      </div>
    </div>
  )
})
