import { useReactFlow } from '@xyflow/react'
import {
  SloppyPresets,
  StrokeWidthPresets,
  type FillStyle,
  type FontFamily,
  type FontSize,
  type StrokeStyle,
  type Style,
  type TextAlign,
  type TextStyle,
  type LinkStyle,
  type ArrowheadType
} from '../../types/style'
import type { NoteNode, LinkEdge } from '../../types/flow'
import { cn } from '@/lib/utils'
import { useMemo, type ReactElement } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'
import { useGraphStore } from '../../store/graph-store'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ColorGrid } from './color-panel'

/** Shared glyphs */
const Section = ({ title, children }: { title: string, children: React.ReactNode }): ReactElement => (
  <div className='space-y-2'>
    <Label className='text-xs text-muted-foreground'>{title}</Label>
    {children}
  </div>
)

const LineGlyph = ({ width = 2, dash }: { width?: number, dash?: number[] }): ReactElement => (
  <svg width='24' height='14' viewBox='0 0 24 14' className='text-foreground/80'>
    <line x1='2' y1='7' x2='22' y2='7' stroke='currentColor' strokeWidth={width} strokeLinecap='round' strokeDasharray={dash?.join(', ')} />
  </svg>
)

const WavyGlyph = ({ amount }: { amount: number }): ReactElement => (
  <svg width='24' height='14' viewBox='0 0 24 14' className='text-foreground/80'>
    <path d={`M2 7 C6 ${7 - amount}, 10 ${7 + amount}, 14 ${7 - amount} S 22 ${7 + amount}, 22 7`} fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' />
  </svg>
)

const FillGlyph = ({ kind }: { kind: FillStyle }): ReactElement => {
  return (
    <svg width='24' height='24' viewBox='0 0 24 24' className='text-foreground/80'>
      <rect x='4' y='4' width='16' height='16' rx='3' ry='3' fill='none' stroke='currentColor' />
      {kind === 'solid' && <rect x='4' y='4' width='16' height='16' rx='3' ry='3' className='fill-foreground/20' />}
      {kind === 'hachure' && (
        <g stroke='currentColor' strokeWidth='1'>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={5} y1={6 + i * 2} x2={19} y2={4 + i * 2} />
          ))}
        </g>
      )}
      {kind === 'cross-hatch' && (
        <g stroke='currentColor' strokeWidth='1'>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`a-${i}`} x1={5} y1={6 + i * 2} x2={19} y2={4 + i * 2} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`b-${i}`} x1={5} y1={18 - i * 2} x2={19} y2={20 - i * 2} />
          ))}
        </g>
      )}
      {kind === 'zigzag' && (
        <polyline points='5,18 9,6 13,18 17,6 19,12' fill='none' stroke='currentColor' strokeWidth='1.5' />
      )}
      {kind === 'dots' && (
        <g className='fill-current'>
          {Array.from({ length: 12 }).map((_, i) => (
            <circle key={i} cx={6 + (i % 4) * 4} cy={6 + Math.floor(i / 4) * 4} r={0.8} />
          ))}
        </g>
      )}
    </svg>
  )
}

const CornerGlyph = ({ r }: { r: 0 | 2 }): ReactElement => (
  <svg width='24' height='24' viewBox='0 0 24 24' className='text-foreground/80'>
    <rect x='4' y='4' width='16' height='16' rx={r * 2} ry={r * 2} fill='none' stroke='currentColor' strokeWidth='1.75' />
  </svg>
)

/** Link glyphs */
const ArrowheadGlyph = ({ kind }: { kind: ArrowheadType }): ReactElement => {
  return (
    <svg width='24' height='24' viewBox='0 0 24 24' className='text-foreground/80'>
      {kind === 'none' && (
        <g stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
          <line x1='6' y1='6' x2='18' y2='18' />
          <line x1='18' y1='6' x2='6' y2='18' />
        </g>
      )}
      {kind === 'arrow' && (
        <path
          d='M 8 6 L 18 12 L 8 18 Z'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      )}
      {kind === 'barb' && (
        <path
          d='M 9 6 L 17 12 L 9 18'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      )}
      {kind === 'arrow-filled' && (
        <path d='M 8 6 L 18 12 L 8 18 Z' className='fill-current' />
      )}
    </svg>
  )
}


/** ———————————————————————————————— Style Panel ———————————————————————————————— **/

type StyleLike = Style | LinkStyle

export interface StylePanelProps<T extends StyleLike = Style> {
  style: T
  onStyleChange: (next: Partial<T>) => void
  includeLinkStyleAttributes?: boolean
  className?: string
}

export function StylePanel<T extends StyleLike>({
  style,
  onStyleChange,
  includeLinkStyleAttributes = false,
  className
}: StylePanelProps<T>): ReactElement {
  const s = style

  function pickColor<K extends keyof T>(key: K, v: T[K] | null): void {
    const next = { [key]: (v ?? undefined) } as Partial<T>
    onStyleChange(next)
  }

  return (
    <Card className={cn('w-full bg-sidebar backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50 shadow-md border border-border', className)}>
      <CardContent className='p-0 h-[600px]'>
        <ScrollArea className='h-full p-3'>
          <div className='flex flex-col items-start gap-4 p-1'>
            {/* Stroke */}
            <Section title='Border'>
              <ColorGrid value={s.strokeColor as string} onPick={v => pickColor('strokeColor' as keyof T, v as T[keyof T] | null)} allowTransparent variant='compact' />
            </Section>

            {/* Background */}
            <Section title='Background'>
              <ColorGrid value={(s as Style).backgroundColor ?? null} onPick={v => pickColor('backgroundColor' as keyof T, v as T[keyof T] | null)} allowTransparent variant='compact' />
            </Section>

            {/* Text color */}
            <Section title='Text color'>
              <ColorGrid value={s.textColor as string} onPick={v => onStyleChange({ textColor: (v || undefined) } as Partial<T>)} variant='compact' />
            </Section>

            <Separator />

            {/* Fill */}
            <Section title='Fill'>
              <ToggleGroup
                type='single'
                value={(s.fillStyle as FillStyle) ?? 'solid'}
                onValueChange={v => v && onStyleChange({ fillStyle: v as T[keyof T] } as Partial<T>)}
                className='flex flex-wrap gap-2'
              >
                {(['hachure', 'dots', 'zigzag', 'solid', 'cross-hatch'] as FillStyle[]).map(kind => (
                  <ToggleGroupItem key={kind} value={kind} className='h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>
                    <FillGlyph kind={kind} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Section>

            {/* Stroke width */}
            <Section title='Stroke width'>
              <ToggleGroup
                type='single'
                value={String(s.strokeWidth ?? 1)}
                onValueChange={v => v && onStyleChange({ strokeWidth: Number(v) } as Partial<T>)}
                className='flex flex-wrap gap-2'
              >
                {StrokeWidthPresets.map(w => (
                  <ToggleGroupItem key={w} value={String(w)} className='h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>
                    <LineGlyph width={w} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Section>

            {/* Stroke style */}
            <Section title='Stroke style'>
              <ToggleGroup
                type='single'
                value={(s.strokeStyle as StrokeStyle) ?? 'solid'}
                onValueChange={v => v && onStyleChange({ strokeStyle: v as T[keyof T] } as Partial<T>)}
                className='flex flex-wrap gap-2'
              >
                <ToggleGroupItem value='solid' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'><LineGlyph width={2} /></ToggleGroupItem>
                <ToggleGroupItem value='dashed' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'><LineGlyph width={2} dash={[6, 4]} /></ToggleGroupItem>
                <ToggleGroupItem value='dotted' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'><LineGlyph width={2} dash={[1, 5]} /></ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* Sloppiness (roughness) */}
            <Section title='Sloppiness'>
              <ToggleGroup
                type='single'
                value={String(s.roughness ?? 0)}
                onValueChange={v => v && onStyleChange({ roughness: Number(v) } as Partial<T>)}
                className='flex flex-wrap gap-2'
              >
                {SloppyPresets.map(val => (
                  <ToggleGroupItem key={val} value={String(val)} className='h-9 w-9 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>
                    <WavyGlyph amount={val * 4} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Section>

            {/* Corner radius (roundness: 0 | 2) */}
            <Section title='Roundness'>
              <ToggleGroup
                type='single'
                value={String(s.roundness ?? 0)}
                onValueChange={v => v && onStyleChange({ roundness: Number(v) as T[keyof T] } as Partial<T>)}
                className='flex gap-2'
              >
                <ToggleGroupItem value='0' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>
                  <CornerGlyph r={0} />
                </ToggleGroupItem>
                <ToggleGroupItem value='2' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>
                  <CornerGlyph r={2} />
                </ToggleGroupItem>
              </ToggleGroup>
            </Section>

            <Separator />

            {/* Text align */}
            <Section title='Text align'>
              <ToggleGroup
                type='single'
                value={(s.textAlign as TextAlign) ?? 'left'}
                onValueChange={v => v && onStyleChange({ textAlign: v as T[keyof T] } as Partial<T>)}
                className='flex gap-2'
              >
                <ToggleGroupItem value='left' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'><AlignLeft className='h-4 w-4' /></ToggleGroupItem>
                <ToggleGroupItem value='center' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'><AlignCenter className='h-4 w-4' /></ToggleGroupItem>
                <ToggleGroupItem value='right' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'><AlignRight className='h-4 w-4' /></ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* Font family */}
            <Section title='Font family'>
              <ToggleGroup
                type='single'
                value={(s.fontFamily as FontFamily) ?? 'sans-serif'}
                onValueChange={v => v && onStyleChange({ fontFamily: v as T[keyof T] } as Partial<T>)}
                className='flex gap-2'
              >
                <ToggleGroupItem value='handwriting' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-handwriting'>Aa</ToggleGroupItem>
                <ToggleGroupItem value='sans-serif' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-sans'>Aa</ToggleGroupItem>
                <ToggleGroupItem value='serif' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-serif'>Aa</ToggleGroupItem>
                <ToggleGroupItem value='monospace' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-mono'>{'<>'}</ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* Font size */}
            <Section title='Font size'>
              <ToggleGroup
                type='single'
                value={(s.fontSize as FontSize) ?? 'M'}
                onValueChange={v => v && onStyleChange({ fontSize: v as T[keyof T] } as Partial<T>)}
                className='flex gap-2'
              >
                <ToggleGroupItem value='S' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>S</ToggleGroupItem>
                <ToggleGroupItem value='M' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>M</ToggleGroupItem>
                <ToggleGroupItem value='L' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>L</ToggleGroupItem>
                <ToggleGroupItem value='XL' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>XL</ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* Text style */}
            <Section title='Text style'>
              <ToggleGroup
                type='single'
                value={(s.textStyle as TextStyle) ?? 'normal'}
                onValueChange={v => v && onStyleChange({ textStyle: v as T[keyof T] } as Partial<T>)}
                className='flex gap-2'
              >
                <ToggleGroupItem value='normal' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>A</ToggleGroupItem>
                <ToggleGroupItem value='italic' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary italic'>I</ToggleGroupItem>
                <ToggleGroupItem value='bold' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary font-bold'>B</ToggleGroupItem>
                <ToggleGroupItem value='underline' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary underline'>U</ToggleGroupItem>
                <ToggleGroupItem value='strikethrough' className='h-9 w-9 items-center justify-center rounded-xl border bg-muted data-[state=on]:bg-primary/10 data-[state=on]:text-primary line-through'>S</ToggleGroupItem>
              </ToggleGroup>
            </Section>

            {/* ——— Link-only attributes ——— */}
            {includeLinkStyleAttributes && (
              <>
                <Separator />
                <Section title='Source arrowhead'>
                  <div className='space-y-1'>
                    <ToggleGroup
                      type='single'
                      value={(s as LinkStyle).sourceArrowhead ?? 'none'}
                      onValueChange={v => v && onStyleChange({ sourceArrowhead: v as ArrowheadType } as unknown as Partial<T>)}
                      className='flex gap-2'
                    >
                      {(['none', 'arrow', 'arrow-filled', 'barb'] as ArrowheadType[]).map(kind => (
                        <ToggleGroupItem key={`src-${kind}`} value={kind} className='h-9 w-12 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>
                          <ArrowheadGlyph kind={kind} />
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </Section>
                <Section title='Target arrowhead'>
                  <div className='space-y-1'>
                    <ToggleGroup
                      type='single'
                      value={(s as LinkStyle).targetArrowhead ?? 'arrow'}
                      onValueChange={v => v && onStyleChange({ targetArrowhead: v as ArrowheadType } as unknown as Partial<T>)}
                      className='flex gap-2'
                    >
                      {(['none', 'arrow', 'arrow-filled', 'barb'] as ArrowheadType[]).map(kind => (
                        <ToggleGroupItem key={`dst-${kind}`} value={kind} className='h-9 w-12 items-center justify-center rounded-xl border bg-muted text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary'>
                          <ArrowheadGlyph kind={kind} />
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </Section>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

/** ———————————————————————————————— Sidebar ———————————————————————————————— **/

export function GraphSidebar(): ReactElement | null {
  const { nodes, edges } = useGraphStore()
  const { setNodes, setEdges } = useReactFlow()

  // selected nodes (exclude sheets as before)
  const selectedNodes = useMemo(
    () => (nodes as NoteNode[]).filter(n => n.selected && n.data.style.type !== 'sheet'),
    [nodes]
  )

  // selected edges
  const selectedEdges = useMemo(
    () => (edges as LinkEdge[]).filter(e => e.selected),
    [edges]
  )

  if (selectedNodes.length === 0 && selectedEdges.length === 0) return null

  // base styles for panels
  const nodeStyle: Style | null = selectedNodes[0]?.data.style ?? null
  const edgeStyle: LinkStyle | null = selectedEdges[0]?.data?.style ?? null

  const handleNodeStyleChange = (next: Partial<Style>): void => {
    setNodes(ns =>
      (ns as NoteNode[]).map(n => {
        if (!n.selected) return n
        if (n.data.style.type === 'sheet') return n
        return {
          ...n,
          data: {
            ...n.data,
            style: { ...n.data.style, ...next }
          }
        }
      })
    )
  }

  const handleEdgeStyleChange = (next: Partial<LinkStyle>): void => {
    setEdges(es =>
      (es as LinkEdge[]).map(e => {
        if (!e.selected) return e
        return {
          ...e,
          data: {
            ...e.data,
            style: { ...(e.data?.style || {}), ...next }
          }
        }
      })
    )
  }

  return (
    <div className='space-y-3'>
      {nodeStyle && (
        <StylePanel<Style>
          style={nodeStyle}
          onStyleChange={handleNodeStyleChange}
          className='w-full'
        />
      )}

      {selectedNodes.length === 0 && edgeStyle && (
        <StylePanel<LinkStyle>
          style={edgeStyle}
          onStyleChange={handleEdgeStyleChange}
          includeLinkStyleAttributes
          className='w-full'
        />
      )}
    </div>
  )
}
