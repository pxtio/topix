import { cn } from "@/lib/utils"
import { getLuminance } from "../../lib/colors/tailwind"
import { darkModeDisplayHex } from "../../lib/colors/dark-variants"

type KeySwatchProps = {
  color: string | null
  label?: string
  selected?: boolean
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  checker?: boolean
  isDark?: boolean
  size?: "dot" | "sm" | "md" | "lg"
  hideLabel?: boolean
  className?: string
}

const SIZE_MAP = {
  dot: "h-6 w-6 rounded-full",
  sm: "h-7 w-7 rounded-md",
  md: "h-9 w-9 rounded-lg",
  lg: "h-11 w-11 rounded-xl",
} as const

export const KeySwatch = ({
  color,
  label,
  selected,
  onClick,
  onContextMenu,
  checker = false,
  isDark = false,
  size = "md",
  hideLabel = false,
  className,
}: KeySwatchProps) => {
  const shown = isDark ? darkModeDisplayHex(color ?? undefined) : color
  const isDarkText = shown ? getLuminance(shown) < 0.5 : false

  const btn = (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "relative border border-border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-secondary",
        SIZE_MAP[size],
        selected && "ring-2 ring-secondary",
        className
      )}
      style={{
        backgroundColor: shown ?? "transparent",
        backgroundImage:
          shown === null || checker
            ? "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)"
            : undefined,
        backgroundSize: shown === null || checker ? "8px 8px" : undefined,
        backgroundPosition:
          shown === null || checker
            ? "0 0, 0 4px, 4px -4px, -4px 0px"
            : undefined,
      }}
      aria-label={label}
    >
      {!hideLabel && label && (
        <span
          className={cn(
            "absolute left-1 top-0.5 text-[10px] font-medium",
            isDarkText ? "text-white/90" : "text-black/90"
          )}
        >
          {label}
        </span>
      )}
    </button>
  )

  return btn
}
