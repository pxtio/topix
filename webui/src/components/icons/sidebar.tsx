import { forwardRef, memo } from "react"
import type { SimpleIconProps } from "./types"

export const SidebarSimpleIcon = memo(
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
            d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.96997 2V22"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.97 9.43945L12.41 11.9995L14.97 14.5595"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
  )
)

SidebarSimpleIcon.displayName = "SidebarSimpleIcon"
