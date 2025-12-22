import { Label } from "@/components/ui/label"
import { useEffect, useMemo, useState } from "react"
import {
  FAMILIES,
  findFamilyShadeFromHex,
  isSameColor,
  isTransparent,
  resolveFamilyShade,
  SHADE_STEPS,
  toBaseHex,
  type Family,
  type Shade,
} from "../../lib/colors/tailwind"
import { KeySwatch } from "./key-swatch"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

type Props = {
  value?: string | null
  onPick: (hexOrNull: string | null) => void
  allowTransparent?: boolean
  controlledShade?: Shade
  onShadeChange?: (s: Shade) => void
  /** Compact = small swatches, labels hidden; right-click shows shades */
  variant?: "default" | "compact"
}

export function ColorGrid({
  value,
  onPick,
  allowTransparent = false,
  controlledShade,
  onShadeChange,
  variant = "default",
}: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const isValueTransparent = isTransparent(value)

  const defaultFamily = useMemo(() => FAMILIES.find(f => !!f.family)!, [])
  const [activeFamily, setActiveFamily] = useState<Family>(defaultFamily)
  const [internalShade, setInternalShade] = useState<Shade>(500)

  const shade: Shade = controlledShade ?? internalShade

  useEffect(() => {
    if (isTransparent(value)) {
      const transparentFam = FAMILIES.find(f => f.transparent)
      if (transparentFam) setActiveFamily(transparentFam)
      return
    }

    const base = toBaseHex(value)
    if (!base) return

    if (isSameColor(base, "#ffffff")) {
      setActiveFamily(FAMILIES.find(f => f.fixedHex === "#ffffff") ?? defaultFamily)
      return
    }
    if (isSameColor(base, "#000000")) {
      setActiveFamily(FAMILIES.find(f => f.fixedHex === "#000000") ?? defaultFamily)
      return
    }

    const match = findFamilyShadeFromHex(base)
    if (match?.family && match?.shade) {
      const fam = FAMILIES.find(f => f.family === match.family) ?? defaultFamily
      setActiveFamily(fam)
      setInternalShade(match.shade)
      onShadeChange?.(match.shade)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const resolveEntryHexAtShade = (f: Family, s: Shade): string | null => {
    if (f.transparent) return null
    if (f.fixedHex) return f.fixedHex
    return f.family ? resolveFamilyShade(f.family, s) : null
  }

  const pickFamily = (f: Family) => {
    if (f.transparent) {
      setActiveFamily(f)
      if (allowTransparent) onPick(null)
      return
    }
    if (f.fixedHex) {
      const baseHex = toBaseHex(f.fixedHex)
      if (baseHex) onPick(baseHex)
      setActiveFamily(f)
      return
    }
    setActiveFamily(f)
    const hex = resolveFamilyShade(f.family!, shade)
    const baseHex = toBaseHex(hex)
    if (baseHex) onPick(baseHex)
  }

  const pickShade = (s: Shade, fam = activeFamily) => {
    if (controlledShade == null) setInternalShade(s)
    onShadeChange?.(s)
    if (!fam.family) return
    const hex = resolveFamilyShade(fam.family, s)
    const baseHex = toBaseHex(hex)
    if (baseHex) onPick(baseHex)
  }

  const FamilyItem = ({ f }: { f: Family }) => {
    const isCompact = variant === "compact"
    const colorHex = resolveEntryHexAtShade(f, shade)
    const selected = f.transparent
      ? isValueTransparent
      : (!isValueTransparent && !!colorHex && isSameColor(value, colorHex))

    // Special entries: no context menu, just pick on click
    if (f.transparent || f.fixedHex) {
      return (
        <KeySwatch
          key={f.id}
          color={colorHex}
          label={f.key}
          selected={selected}
          onClick={() => pickFamily(f)}
          checker={!!f.transparent}
          isDark={isDark}
          size={isCompact ? "sm" : "md"}
          hideLabel={isCompact}
          className={isCompact ? "ring-offset-0" : undefined}
        />
      )
    }

    // Tailwind families
    if (isCompact && f.family) {
      // Right-click (native contextmenu) will open ContextMenuContent automatically.
      return (
        <ContextMenu key={f.id}>
          <ContextMenuTrigger asChild>
            <KeySwatch
              color={colorHex}
              label={f.key}
              selected={selected}
              onClick={() => pickFamily(f)} // left click picks immediately
              isDark={isDark}
              size="sm"
              hideLabel
              className="ring-offset-0"
            />
          </ContextMenuTrigger>
          <ContextMenuContent className="p-2">
            <div className="grid grid-cols-4 gap-1">
              {SHADE_STEPS.map((step) => {
                const hex = resolveFamilyShade(f.family!, step)
                const selectedShade = !isValueTransparent && !!hex && isSameColor(value, hex)
                const baseHex = toBaseHex(hex)
                return (
                  <KeySwatch
                    key={step}
                    color={hex}
                    selected={selectedShade}
                    onClick={() => {
                      if (baseHex) {
                        setActiveFamily(f)
                        pickShade(step, f)
                      }
                    }}
                    isDark={isDark}
                    size="sm"
                    hideLabel
                  />
                )
              })}
            </div>
          </ContextMenuContent>
        </ContextMenu>
      )
    }

    // Default variant (no right-click shades)
    return (
      <KeySwatch
        key={f.id}
        color={colorHex}
        label={f.key}
        selected={selected}
        onClick={() => pickFamily(f)}
        isDark={isDark}
        size="md"
      />
    )
  }

  return (
    <div className="space-y-2">
      {/* Always 6 columns */}
      <div className={cn("grid gap-2 grid-cols-6")}>
        {FAMILIES
          .filter(f => allowTransparent || !f.transparent)
          .map(f => (
            <FamilyItem key={f.id} f={f} />
          ))}
      </div>

      {variant === "default" && activeFamily.family && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Shades — {activeFamily.family}
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {SHADE_STEPS.map((step, i) => {
              const hex = resolveFamilyShade(activeFamily.family!, step)
              const selected = !!hex && isSameColor(value, hex)
              const baseHex = toBaseHex(hex)
              return (
                <KeySwatch
                  key={step}
                  color={hex}
                  label={`⇧${i + 1}`}
                  selected={selected}
                  onClick={() => baseHex && pickShade(step)}
                  isDark={isDark}
                  size="md"
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
