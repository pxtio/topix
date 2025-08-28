import { useReactFlow } from "@xyflow/react"
import { SloppyPresets, StrokeWidthPresets, type FillStyle, type FontFamily, type FontSize, type StrokeStyle, type Style, type TextAlign, type TextStyle } from "../../types/style"
import type { NoteNode } from "../../types/flow"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Label } from "@/components/ui/label"
import { useGraphStore } from "../../store/graph-store"
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react"
import type { OptionalStringKeys } from "@/types/generic"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ColorGrid } from "./color-panel"


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


function StylePanel({ style, onStyleChange, className }: StylePanelProps) {
  const s = style

  function pickColor<K extends OptionalStringKeys<Style>>(key: K, v: string | null) {
    const next = { [key]: (v ?? undefined) } as { [P in K]: Style[P] }
    onStyleChange(next)
  }

  return (
    <Card className={cn("w-full bg-sidebar backdrop-blur supports-[backdrop-filter]:bg-sidebar/50 shadow-md border border-border", className)}>
      <CardContent className="p-0 h-[600px]">
        <ScrollArea className='h-full p-3'>
          <div className='flex flex-col items-start gap-4 p-1'>
            {/* Stroke */}
            <Section title="Stroke">
              <ColorGrid value={s.strokeColor} onPick={v => pickColor("strokeColor", v)} allowTransparent />
            </Section>

            {/* Text color */}
            <Section title="Text color">
              <ColorGrid value={s.textColor ?? null} onPick={v => onStyleChange({ textColor: v })} />
            </Section>

            {/* Background */}
            <Section title="Background">
              <ColorGrid value={s.backgroundColor ?? null} onPick={v => pickColor("backgroundColor", v)} allowTransparent />
            </Section>

            <Separator />

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
                {StrokeWidthPresets.map(w => (
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
                {SloppyPresets.map(val => (
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

            {/* Font family */}
            <Section title="Font family">
              <ToggleGroup type="single" value={s.fontFamily ?? "sans"} onValueChange={v => v && onStyleChange({ fontFamily: v as FontFamily })} className="flex gap-2">
                <ToggleGroupItem value="handwriting" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-handwriting">Aa</ToggleGroupItem>
                <ToggleGroupItem value="sans-serif" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-sans">Aa</ToggleGroupItem>
                <ToggleGroupItem value="serif" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-serif">Aa</ToggleGroupItem>
                <ToggleGroupItem value="monospace" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-mono">{"<>"}</ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* Font size */}
            <Section title="Font size">
              <ToggleGroup type="single" value={s.fontSize ?? "M"} onValueChange={v => v && onStyleChange({ fontSize: v as FontSize })} className="flex gap-2">
                <ToggleGroupItem value="S" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary">S</ToggleGroupItem>
                <ToggleGroupItem value="M" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary">M</ToggleGroupItem>
                <ToggleGroupItem value="L" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary">L</ToggleGroupItem>
                <ToggleGroupItem value="XL" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary">XL</ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* Text style */}
            <Section title="Text style">
              <ToggleGroup type="single" value={s.textStyle ?? "normal"} onValueChange={v => v && onStyleChange({ textStyle: v as TextStyle })} className="flex gap-2">
                <ToggleGroupItem value="normal" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary">A</ToggleGroupItem>
                <ToggleGroupItem value="italic" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary italic">I</ToggleGroupItem>
                <ToggleGroupItem value="bold" className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-bold">B</ToggleGroupItem>
                <ToggleGroupItem value='underline' className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary underline">U</ToggleGroupItem>
                <ToggleGroupItem value='strikethrough' className="h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary line-through">S</ToggleGroupItem>
              </ToggleGroup>
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