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
import { KeySwatch } from "./key-swatch" // ensure path matches your structure
import { useTheme } from "@/components/theme-provider" // wherever your hook is

export function ColorGrid({
  value,
  onPick,
  allowTransparent = false,
  controlledShade,
  onShadeChange,
}: {
  value?: string | null
  onPick: (hexOrNull: string | null) => void
  allowTransparent?: boolean
  controlledShade?: Shade
  onShadeChange?: (s: Shade) => void
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const defaultFamily = useMemo(() => FAMILIES.find(f => !!f.family)!, [])
  const [activeFamily, setActiveFamily] = useState<Family>(defaultFamily)
  const [internalShade, setInternalShade] = useState<Shade>(500)

  const shade: Shade = controlledShade ?? internalShade

  useEffect(() => {
    // transparent
    if (isTransparent(value)) {
      const transparentFam = FAMILIES.find(f => f.transparent)
      if (transparentFam) setActiveFamily(transparentFam)
      return
    }

    const base = toBaseHex(value)
    if (!base) return

    // fixed colors …
    if (isSameColor(base, "#ffffff")) {
      setActiveFamily(FAMILIES.find(f => f.fixedHex === "#ffffff") ?? defaultFamily)
      return
    }
    if (isSameColor(base, "#000000")) {
      setActiveFamily(FAMILIES.find(f => f.fixedHex === "#000000") ?? defaultFamily)
      return
    }

    // tailwind families …
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

  const pickShade = (s: Shade) => {
    if (controlledShade == null) setInternalShade(s)
    onShadeChange?.(s)
    if (!activeFamily.family) return
    const hex = resolveFamilyShade(activeFamily.family, s)
    const baseHex = toBaseHex(hex)
    if (baseHex) onPick(baseHex)
  }

  return (
    <div className="space-y-3">
      {/* Top row: every family previewed at current shade */}
      <div className="grid grid-cols-6 gap-2">
        {FAMILIES
          .filter(f => allowTransparent || !f.transparent)
          .map(f => {
            const colorHex = resolveEntryHexAtShade(f, shade)
            const selected = f.transparent
              ? isTransparent(value)
              : !!colorHex && isSameColor(value, colorHex)
            return (
              <KeySwatch
                key={f.id}
                color={colorHex}
                label={f.key}
                selected={selected}
                onClick={() => pickFamily(f)}
                checker={!!f.transparent}
                isDark={isDark} // <= pass effective theme here
              />
            )
          })}
      </div>

      {/* Shades row */}
      {activeFamily.family && (
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
                  isDark={isDark} // <= also here
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
