import { forwardRef, memo } from "react"
import type { SimpleIconProps } from "./types"


export const EditSimpleIcon = memo(
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
            d="M11 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V13"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.04 3.01928L8.16 10.8993C7.86 11.1993 7.56 11.7893 7.5 12.2193L7.07 15.2293C6.91 16.3193 7.68 17.0793 8.77 16.9293L11.78 16.4993C12.2 16.4393 12.79 16.1393 13.1 15.8393L20.98 7.95928C22.34 6.59928 22.98 5.01928 20.98 3.01928C18.98 1.01928 17.4 1.65928 16.04 3.01928Z"
            stroke={color}
            strokeMiterlimit={10}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.91 4.15039C15.58 6.54039 17.45 8.41039 19.85 9.09039"
            stroke={color}
            strokeMiterlimit={10}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
  )
)

EditSimpleIcon.displayName = "EditSimpleIcon"
