import { cn } from "@/lib/utils"
import { getLuminance } from "../../lib/colors/tailwind"
import { darkModeDisplayHex } from "../../lib/colors/dark-variants"

type KeySwatchProps = {
  color: string | null
  label?: string
  selected?: boolean
  onClick: () => void
  checker?: boolean
  isDark?: boolean
}

export const KeySwatch = ({
  color,
  label,
  selected,
  onClick,
  checker = false,
  isDark = false,
}: KeySwatchProps) => {
  // Only the *display* color is flipped for dark mode.
  const shown = isDark ? darkModeDisplayHex(color ?? undefined) : color
  const isDarkText = shown ? getLuminance(shown) < 0.5 : false

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative h-9 w-9 rounded-lg border border-border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary",
        selected && "ring-2 ring-primary"
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
    >
      {label && (
        <span
          className={cn(
            "absolute left-1 top-0.5 text-[10px] font-medium",
            isDarkText ? "text-white/90" : "text-foreground/80"
          )}
        >
          {label}
        </span>
      )}
    </button>
  )
}
