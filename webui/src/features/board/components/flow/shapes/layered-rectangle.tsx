import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughRect } from '@/components/rough/rect'
import { useTheme } from '@/components/theme-provider'
import { darkerDisplayHex, lighterDisplayHex } from '../../../lib/colors/dark-variants'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type LayeredRectangleProps = {
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

export const LayeredRectangle = memo(({
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
}: LayeredRectangleProps) => {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const offsetX = 12
  const offsetY = 12

  const commonProps = {
    rounded,
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
        style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
      >
        <RoughRect {...commonProps} fill={backFill} stroke={backStroke} widthPx={widthPx} heightPx={heightPx} className='w-full h-full' rounded={rounded} />
      </div>
      <div className='relative w-full h-full'>
        <RoughRect {...commonProps} widthPx={widthPx} heightPx={heightPx} className='w-full h-full' rounded={rounded}>
          {children}
        </RoughRect>
      </div>
    </div>
  )
})
