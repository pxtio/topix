import type { SVGProps } from "react"

export type SimpleIconProps = SVGProps<SVGSVGElement> & {
  color?: string
  size?: number | string
  strokeWidth?: number | string
  className?: string
}