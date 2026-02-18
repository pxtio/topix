import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughCircle } from '@/components/rough/circ'
import { RoughRect } from '@/components/rough/rect'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type CapsuleProps = {
  rounded: 'none' | 'rounded-2xl'
  wrapperClass: string
  wrapperStyle: CSSProperties
  widthPx?: number
  heightPx?: number
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
  rounded,
  wrapperClass,
  wrapperStyle,
  widthPx,
  heightPx,
  roughness,
  fill,
  fillStyle,
  stroke,
  strokeStyle,
  strokeWidth,
  seed,
  children
}: CapsuleProps) => {
  const accentSize = 56
  const overlap = accentSize * 0.1

  const circleProps = {
    rounded,
    roughness,
    fill,
    fillStyle,
    stroke,
    strokeStyle,
    strokeWidth,
    seed
  }

  return (
    <div className={clsx(wrapperClass, 'flex items-center gap-0')} style={wrapperStyle}>
      <div className='relative shrink-0' style={{ width: accentSize, height: accentSize }}>
        <div className='absolute inset-0 translate-x-1 translate-y-1 pointer-events-none' style={{ filter: 'brightness(0.85)' }}>
          <RoughCircle {...circleProps} widthPx={accentSize} heightPx={accentSize} className='w-full h-full' />
        </div>
        <div className='relative w-full h-full z-10 pointer-events-none'>
          <RoughCircle {...circleProps} widthPx={accentSize} heightPx={accentSize} className='w-full h-full' />
        </div>
      </div>
      <div className='relative flex-1 h-full' style={{ marginLeft: overlap }}>
        <RoughRect
          {...circleProps}
          widthPx={typeof widthPx === 'number' ? Math.max(1, widthPx - accentSize - overlap) : undefined}
          heightPx={heightPx}
          className='w-full h-full'
        >
          {children}
        </RoughRect>
      </div>
    </div>
  )
})
