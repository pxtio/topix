import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughCircle } from '@/components/rough/circ'
import { RoughRect } from '@/components/rough/rect'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type ThoughtCloudProps = {
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
  backgroundColor?: string
  children: ReactNode
}

export const ThoughtCloud = memo(({
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
  backgroundColor,
  children
}: ThoughtCloudProps) => {
  const baseHeight = Math.max(minHeight, 50)
  const accentSize = Math.min(80, Math.max(45, baseHeight * 0.7))
  const circleLeft = accentSize * 0.18
  const circleTop = -accentSize * 0.4

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
        className='absolute pointer-events-none'
        style={{ width: accentSize, height: accentSize, left: circleLeft, top: circleTop, zIndex: 5 }}
      >
        <RoughCircle {...commonProps} className='w-full h-full' />
      </div>
      <div className='relative w-full h-full z-10'>
        <RoughRect {...commonProps} className='w-full h-full' rounded='rounded-2xl'>
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
        }}
      />
    </div>
  )
})
