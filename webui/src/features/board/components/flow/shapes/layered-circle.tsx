import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughCircle } from '@/components/rough/circ'
import { useTheme } from '@/components/theme-provider'
import { darkerDisplayHex, lighterDisplayHex } from '../../../lib/colors/dark-variants'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type LayeredCircleProps = {
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

export const LayeredCircle = memo(({
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
}: LayeredCircleProps) => {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const offset = 12

  const commonProps = {
    roughness,
    fill,
    fillStyle,
    stroke,
    strokeStyle,
    strokeWidth,
    seed
  }

  const backFill = isDark ? lighterDisplayHex(fill) ?? fill : darkerDisplayHex(fill) ?? fill
  const backStroke = isDark ? lighterDisplayHex(stroke) ?? stroke : darkerDisplayHex(stroke) ?? stroke

  return (
    <div className={clsx(wrapperClass)} style={wrapperStyle}>
      <div
        className='absolute inset-0 pointer-events-none'
        style={{ transform: `translate(${offset}px, ${offset}px)` }}
      >
        <RoughCircle {...commonProps} fill={backFill} stroke={backStroke} widthPx={widthPx} heightPx={heightPx} className='w-full h-full' />
      </div>
      <div className='relative w-full h-full'>
        <RoughCircle {...commonProps} widthPx={widthPx} heightPx={heightPx} className='w-full h-full'>
          {children}
        </RoughCircle>
      </div>
    </div>
  )
})
