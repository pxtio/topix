import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughDiamond } from '@/components/rough/diam'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type SoftDiamondProps = {
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

export const SoftDiamond = memo(({
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
}: SoftDiamondProps) => {
  const offset = 0

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
    <div className={clsx('relative w-full h-full', wrapperClass)} style={wrapperStyle}>
      <div className='absolute inset-0 pointer-events-none flex items-center justify-center'>
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${offset}px, ${offset}px) scale(1.08)`,
            transformOrigin: 'center',
            filter: 'brightness(0.75)'
          }}
        >
          <RoughDiamond {...commonProps} />
        </div>
      </div>
      <div className='relative w-full h-full flex items-center justify-center'>
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${-offset / 2}px, ${-offset / 2}px) scale(0.96)`,
            transformOrigin: 'center'
          }}
        >
          <RoughDiamond {...commonProps}>
            {children}
          </RoughDiamond>
        </div>
      </div>
    </div>
  )
})
