import { useReactFlow } from "@xyflow/react"
import type { FillStyle, StrokeStyle, Style, TextAlign } from "../../types/style"
import type { NoteNode } from "../../types/flow"
import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Label } from "@/components/ui/label"
import { useGraphStore } from "../../store/graph-store"
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react"
import { cssVarToHex } from "../../utils/color"
import type { OptionalStringKeys } from "@/types/generic"
import { ScrollArea } from "@/components/ui/scroll-area"


export interface StylePanelProps {
  style: Style
  onStyleChange: (next: Partial<Style>) => void
  className?: string
}



const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-xs text-muted-foreground">{title}</Label>
    {children}
  </div>
)

const LineGlyph = ({ width = 2, dash }: { width?: number, dash?: number[] }) => (
  <svg width="24" height="14" viewBox="0 0 24 14" className="text-foreground/80">
    <line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeDasharray={dash?.join(", ")} />
  </svg>
)

const WavyGlyph = ({ amount }: { amount: number }) => (
  <svg width="24" height="14" viewBox="0 0 24 14" className="text-foreground/80">
    <path d={`M2 7 C6 ${7 - amount}, 10 ${7 + amount}, 14 ${7 - amount} S 22 ${7 + amount}, 22 7`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
  </svg>
)

const FillGlyph = ({ kind }: { kind: FillStyle }) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="text-foreground/80">
      <rect x="4" y="4" width="16" height="16" rx="3" ry="3" fill="none" stroke="currentColor" />
      {kind === "solid" && <rect x="4" y="4" width="16" height="16" rx="3" ry="3" className="fill-foreground/20" />}
      {kind === "hachure" && (
        <g stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={5} y1={6 + i * 2} x2={19} y2={4 + i * 2} />
          ))}
        </g>
      )}
      {kind === "cross-hatch" && (
        <g stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`a-${i}`} x1={5} y1={6 + i * 2} x2={19} y2={4 + i * 2} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`b-${i}`} x1={5} y1={18 - i * 2} x2={19} y2={20 - i * 2} />
          ))}
        </g>
      )}
      {kind === "zigzag" && (
        <polyline points="5,18 9,6 13,18 17,6 19,12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
      {kind === "dots" && (
        <g className="fill-current">
          {Array.from({ length: 12 }).map((_, i) => (
            <circle key={i} cx={6 + (i % 4) * 4} cy={6 + Math.floor(i / 4) * 4} r={0.8} />
          ))}
        </g>
      )}
    </svg>
  )
}

// Minimal fallback hex map for a small palette, used only if CSS vars are missing
const TAILWIND_HEX: Record<string, Record<number, string>> = {
  slate:   {100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b'},
  neutral: {100:'#f5f5f5',200:'#e5e5e5',300:'#d4d4d4',400:'#a3a3a3',500:'#737373'},
  stone:   {100:'#f5f5f4',200:'#e7e5e4',300:'#d6d3d1',400:'#a8a29e',500:'#78716c'},
  rose:    {100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e'},
  teal:    {100:'#ccfbf1',200:'#99f6e4',300:'#5eead4',400:'#2dd4bf',500:'#14b8a6'},
  blue:    {100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6'},
  violet:  {100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6'},
  fuchsia: {100:'#fdf4ff',200:'#fae8ff',300:'#f5d0fe',400:'#f0abfc',500:'#d946ef'},
  pink:    {100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899'},
  green:   {100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e'},
  cyan:    {100:'#cffafe',200:'#a5f3fc',300:'#67e8f9',400:'#22d3ee',500:'#06b6d4'},
  orange:  {100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316'},
  amber:   {100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b'},
  red:     {100:'#fee2e2',200:'#fecaca',300:'#fca5a5',400:'#f87171',500:'#ef4444'},
}

// Resolve a family+shade to hex using CSS var first, then fallback
const resolveFamilyShade = (family: string, shade: number) => {
  const varHex = cssVarToHex(`var(--color-${family}-${shade})`)
  return varHex ?? TAILWIND_HEX[family]?.[shade] ?? null
}

const SHADE_STEPS = [100, 200, 300, 400, 500] as const

type Family = {
  id: string
  key?: string
  family?: string
  transparent?: boolean
  fixedHex?: string   // NEW: for white/black (or any fixed color)
}


const FAMILIES: Family[] = [
  { id: 'transparent', key: 'q', transparent: true },
  { id: 'white', fixedHex: '#ffffff' },   // NEW
  { id: 'black', fixedHex: '#000000' },   // NEW
  { id: 'slate', key: 'w', family: 'slate' },
  { id: 'neutral', key: 'e', family: 'neutral' },
  { id: 'stone', key: 'r', family: 'stone' },
  { id: 'rose', key: 't', family: 'rose' },
  { id: 'teal', key: 'a', family: 'teal' },
  { id: 'blue', key: 's', family: 'blue' },
  { id: 'violet', key: 'd', family: 'violet' },
  { id: 'fuchsia', key: 'f', family: 'fuchsia' },
  { id: 'pink', key: 'g', family: 'pink' },
  { id: 'green', key: 'z', family: 'green' },
  { id: 'cyan', key: 'x', family: 'cyan' },
  { id: 'orange', key: 'c', family: 'orange' },
  { id: 'amber', key: 'v', family: 'amber' },
  { id: 'red', key: 'b', family: 'red' },
]

const resolveEntryBaseHex = (f: Family) =>
  f.transparent ? null : f.fixedHex ?? (f.family ? resolveFamilyShade(f.family, 500) : null)

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

// helpers for robust color comparison
const toBaseHex = (c?: string | null) => {
  if (!c) return null
  const hex = cssVarToHex(c) ?? c
  if (!hex || !hex.startsWith('#')) return null
  const h = hex.slice(1).toLowerCase()
  const base = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6)
  return '#' + base
}

const isSameColor = (a?: string | null, b?: string | null) => {
  const A = toBaseHex(a)
  const B = toBaseHex(b)
  return !!A && !!B && A === B
}

const isTransparent = (v?: string | null) => {
  if (v == null) return true
  const hx = cssVarToHex(v)
  return hx === '#00000000'
}

// DROP-IN: replace your existing ColorGrid with this
function ColorGrid({
  value,
  onPick,
  allowTransparent = false
}: {
  value?: string | null
  onPick: (hexOrNull: string | null) => void
  allowTransparent?: boolean
}) {
  const [activeFamily, setActiveFamily] = useState<Family>(
    FAMILIES.find(f => !!f.family)!
  )

  const pickFamily = (f: Family) => {
    if (f.transparent) {
      if (allowTransparent) onPick(null)
      return
    }
    // fixed colors (white/black) pick immediately and keep the current shade family
    if (f.fixedHex) {
      const baseHex = toBaseHex(f.fixedHex)
      if (baseHex) onPick(baseHex)
      return
    }
    // shade-able family\n
    setActiveFamily(f)
    const base = resolveFamilyShade(f.family!, 500)
    const baseHex = toBaseHex(base)
    if (baseHex) onPick(baseHex)
  }

  return (
    <div className='space-y-3'>
      {/* Colors row (includes transparent, white, black, families) */}
      <div className='grid grid-cols-6 gap-2'>
        {FAMILIES
          .filter(f => allowTransparent || !f.transparent)
          .map(f => {
            const colorHex = resolveEntryBaseHex(f)
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

      {/* Shades row (only for actual Tailwind families) */}
      {activeFamily.family && (
        <div className='space-y-1'>
          <Label className='text-xs text-muted-foreground'>Shades</Label>
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
                  onClick={() => baseHex && onPick(baseHex)}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


function StylePanel({ style, onStyleChange, className }: StylePanelProps) {
  const s = style

  function pickColor<K extends OptionalStringKeys<Style>>(key: K, v: string | null) {
    const next = { [key]: (v ?? undefined) } as { [P in K]: Style[P] }
    onStyleChange(next)
  }

  // roughness presets (Excalidraw-ish "Sloppiness")
  const sloppyPresets = [0, 0.5, 1]

  return (
    <Card className={cn("w-full bg-sidebar backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <CardContent className="p-0 h-[600px]">
        <ScrollArea className='h-full p-3'>
          <div className='flex flex-col items-start gap-4'>
            {/* Stroke */}
            <Section title="Stroke">
              <ColorGrid value={s.strokeColor} onPick={v => pickColor("strokeColor", v)} />
            </Section>

            {/* Background */}
            <Section title="Background">
              <ColorGrid value={s.backgroundColor ?? null} onPick={v => pickColor("backgroundColor", v)} allowTransparent />
            </Section>

            {/* Fill */}
            <Section title="Fill">
              <ToggleGroup type="single" value={s.fillStyle} onValueChange={v => v && onStyleChange({ fillStyle: v as FillStyle })} className="flex flex-wrap gap-2">
                {(["hachure","dots","zigzag","solid","cross-hatch"] as FillStyle[]).map(kind => (
                  <ToggleGroupItem key={kind} value={kind} className="h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                    <FillGlyph kind={kind} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Section>

            {/* Stroke width */}
            <Section title="Stroke width">
              <ToggleGroup type="single" value={String(s.strokeWidth ?? 1)} onValueChange={v => v && onStyleChange({ strokeWidth: Number(v) })} className="flex flex-wrap gap-2">
                {[0.75,1,2].map(w => (
                  <ToggleGroupItem key={w} value={String(w)} className="h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                    <LineGlyph width={w} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Section>

            {/* Stroke style */}
            <Section title="Stroke style">
              <ToggleGroup type="single" value={s.strokeStyle ?? "solid"} onValueChange={v => v && onStyleChange({ strokeStyle: v as StrokeStyle })} className="flex flex-wrap gap-2">
                <ToggleGroupItem value="solid" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary"><LineGlyph width={2} /></ToggleGroupItem>
                <ToggleGroupItem value="dashed" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary"><LineGlyph width={2} dash={[6,4]} /></ToggleGroupItem>
                <ToggleGroupItem value="dotted" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary"><LineGlyph width={2} dash={[1,5]} /></ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* Sloppiness (roughness) */}
            <Section title="Sloppiness">
              <ToggleGroup type="single" value={String(s.roughness ?? 0)} onValueChange={v => v && onStyleChange({ roughness: Number(v) })} className="flex flex-wrap gap-2">
                {sloppyPresets.map(val => (
                  <ToggleGroupItem key={val} value={String(val)} className="h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                    <WavyGlyph amount={val} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Section>

            <Separator />

            {/* Text align */}
            <Section title="Text align">
              <ToggleGroup type="single" value={s.textAlign ?? "left"} onValueChange={v => v && onStyleChange({ textAlign: v as TextAlign })} className="flex gap-2">
                <ToggleGroupItem value="left" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary"><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="center" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary"><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="right" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary"><AlignRight className="h-4 w-4" /></ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* Text color */}
            <Section title="Text color">
              <ColorGrid value={s.color ?? null} onPick={v => onStyleChange({ color: v })} />
            </Section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}


export function GraphSidebar() {
  const { nodes } = useGraphStore()

  const { setNodes } = useReactFlow()

  const node = useMemo(() => nodes.find(n => n.selected) as NoteNode | undefined, [nodes])

  if (!node) return null

  const s = node.data.style

  const handleStyleChange = (next: Partial<Style>) => {
    setNodes(ns => ns.map(n => n.id === node.id ? {
      ...n,
      data: {
        ...n.data,
        style: { ...s, ...next }
      }
    } : n))
  }

  return (
    <StylePanel style={s} onStyleChange={handleStyleChange} />
  )
}