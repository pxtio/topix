import { memo, type CSSProperties, type ReactNode } from 'react'
import clsx from 'clsx'
import { RoughDiamond } from '@/components/rough/diam'
import { useTheme } from '@/components/theme-provider'
import { darkerDisplayHex, lighterDisplayHex } from '../../../lib/colors/dark-variants'
import type { FillStyle, StrokeStyle, StrokeWidth } from '../../../types/style'

type LayeredDiamondProps = {
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

export const LayeredDiamond = memo(({
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
}: LayeredDiamondProps) => {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const offsetY = 24

  const commonProps = {
    roughness,
    fill,
    fillStyle,
    stroke,
    strokeStyle,
    strokeWidth,
    seed,
    rounded,
    className: 'w-full h-full'
  }

  const backFill = isDark ? lighterDisplayHex(fill) ?? fill : darkerDisplayHex(fill) ?? fill
  const backStroke = isDark ? lighterDisplayHex(stroke) ?? stroke : darkerDisplayHex(stroke) ?? stroke

  return (
    <div className={clsx(wrapperClass)} style={wrapperStyle}>
      <div
        className='absolute inset-0 pointer-events-none'
        style={{ transform: `translate(0px, ${offsetY}px)` }}
      >
        <RoughDiamond {...commonProps} fill={backFill} stroke={backStroke} />
      </div>
      <div className='relative w-full h-full'>
        <RoughDiamond {...commonProps}>
          {children}
        </RoughDiamond>
      </div>
    </div>
  )
})
