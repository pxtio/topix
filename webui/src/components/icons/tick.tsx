import { forwardRef, memo } from "react"
import type { SimpleIconProps } from "./types"

export const TickSimpleIcon = memo(
  forwardRef<SVGSVGElement, SimpleIconProps>(
    (
      {
        color = "currentColor",
        size = 24,
        strokeWidth = 1.75,
        className,
        ...rest
      },
      ref
    ) => {
      return (
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={strokeWidth as number}
          className={className}
          {...rest}
        >
          <path
            d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.75 11.9999L10.58 14.8299L16.25 9.16992"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
  )
)

TickSimpleIcon.displayName = "TickSimpleIcon"
