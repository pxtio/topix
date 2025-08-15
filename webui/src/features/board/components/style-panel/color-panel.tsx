import { Label } from "@/components/ui/label"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { FAMILIES, findFamilyShadeFromHex, isSameColor, isTransparent, resolveFamilyShade, SHADE_STEPS, toBaseHex, type Family, type Shade } from "../../lib/colors/tailwind"

const KeySwatch = ({ color, label, selected, onClick, checker = false }: {
  color: string | null
  label?: string
  selected?: boolean
  onClick: () => void
  checker?: boolean
}) => (
  <button
    type='button'
    onClick={onClick}
    className={cn(
      'relative h-9 w-9 rounded-lg border border-border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary',
      selected && 'ring-2 ring-primary'
    )}
    style={{
      backgroundColor: color ?? 'transparent',
      backgroundImage: color === null || checker
        ? 'linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)'
        : undefined,
      backgroundSize: color === null || checker ? '8px 8px' : undefined,
      backgroundPosition: color === null || checker ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined
    }}
  >
    {label && (
      <span className='absolute left-1 top-0.5 text-[10px] font-medium text-foreground/80'>
        {label}
      </span>
    )}
  </button>
)

export function ColorGrid({
  value,
  onPick,
  allowTransparent = false,
  /* NEW: optional controlled shade */
  controlledShade,
  onShadeChange,
}: {
  value?: string | null
  onPick: (hexOrNull: string | null) => void
  allowTransparent?: boolean
  controlledShade?: Shade
  onShadeChange?: (s: Shade) => void
}) {
  const defaultFamily = useMemo(() => FAMILIES.find(f => !!f.family)!, [])
  const [activeFamily, setActiveFamily] = useState<Family>(defaultFamily)
  const [internalShade, setInternalShade] = useState<Shade>(500)

  const shade: Shade = controlledShade ?? internalShade

  useEffect(() => {
  // transparent
  if (isTransparent(value)) {
    const transparentFam = FAMILIES.find(f => f.transparent)
    if (transparentFam) setActiveFamily(transparentFam)  // <-- add this
    return
  }

  const base = toBaseHex(value)
  if (!base) return

  // fixed colors …
  if (isSameColor(base, '#ffffff')) {
    setActiveFamily(FAMILIES.find(f => f.fixedHex === '#ffffff') ?? defaultFamily)
    return
  }
  if (isSameColor(base, '#000000')) {
    setActiveFamily(FAMILIES.find(f => f.fixedHex === '#000000') ?? defaultFamily)
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
}, [value])  // eslint-disable-line react-hooks/exhaustive-deps

  const resolveEntryHexAtShade = (f: Family, s: Shade): string | null => {
    if (f.transparent) return null
    if (f.fixedHex) return f.fixedHex
    return f.family ? resolveFamilyShade(f.family, s) : null
  }

  const pickFamily = (f: Family) => {
    if (f.transparent) {
      setActiveFamily(f)             // <-- add this
      if (allowTransparent) onPick(null)
      return
    }
    if (f.fixedHex) {
      const baseHex = toBaseHex(f.fixedHex)
      if (baseHex) onPick(baseHex)
      // Optionally reflect fixed color as active family (or keep previous)
      setActiveFamily(f)             // optional; safe either way
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
    <div className='space-y-3'>
      {/* Top row: every family previewed at current shade */}
      <div className='grid grid-cols-6 gap-2'>
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
              />
            )
          })}
      </div>

      {/* Shades row */}
      {activeFamily.family && (
        <div className='space-y-1'>
          <Label className='text-xs text-muted-foreground'>
            Shades — {activeFamily.family}
          </Label>
          <div className='flex flex-wrap items-center gap-2'>
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
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
