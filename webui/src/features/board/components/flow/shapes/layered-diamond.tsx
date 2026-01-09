import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughDiamond } from '@/components/rough/diam'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type LayeredDiamondProps = {
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

export const LayeredDiamond = memo(({
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
}: LayeredDiamondProps) => {
  const baseSize = Math.max(minHeight, 50)
  const offsetY = Math.min(baseSize * 0.18, 20)

  const commonProps = {
    roughness,
    fill,
    fillStyle,
    stroke,
    strokeStyle,
    strokeWidth,
    seed,
    rounded: 'rounded-2xl' as const,
    className: 'w-full h-full'
  }

  return (
    <div className={clsx(wrapperClass)} style={wrapperStyle}>
      <div
        className='absolute inset-0 pointer-events-none'
        style={{ transform: `translate(0px, ${offsetY}px)`, filter: 'brightness(0.9)' }}
      >
        <RoughDiamond {...commonProps} />
      </div>
      <div className='relative w-full h-full'>
        <RoughDiamond {...commonProps}>
          {children}
        </RoughDiamond>
      </div>
    </div>
  )
})
