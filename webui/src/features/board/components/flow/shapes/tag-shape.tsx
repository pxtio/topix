import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughTag } from '@/components/rough/tag'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type TagShapeProps = {
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

export const TagShape = memo(({
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
}: TagShapeProps) => {
  return (
    <div className={clsx('relative w-full h-full', wrapperClass)} style={{ minHeight, ...wrapperStyle }}>
      <RoughTag
        roughness={roughness}
        fill={fill}
        fillStyle={fillStyle}
        stroke={stroke}
        strokeStyle={strokeStyle}
        strokeWidth={strokeWidth}
        seed={seed}
        className='w-full h-full'
      >
        <div
          className='w-full h-full'
          style={{
            paddingLeft: 'calc(14% + 14px)',
            paddingRight: '12px',
            paddingTop: '12px',
            paddingBottom: '12px',
          }}
        >
          {children}
        </div>
      </RoughTag>
    </div>
  )
})
