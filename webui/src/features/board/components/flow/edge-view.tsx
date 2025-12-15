import {
  BaseEdge,
  EdgeLabelRenderer,
  getSimpleBezierPath,
  getStraightPath,
  getSmoothStepPath,
  useInternalNode,
  type EdgeProps
} from '@xyflow/react'
import type { CSSProperties, ReactElement } from 'react'
import { memo, useEffect, useMemo, useRef } from 'react'
import type { LinkEdge } from '../../types/flow'
import type { ArrowheadType, LinkStyle } from '../../types/style'
import { getEdgeParams } from '../../utils/flow'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { LiteMarkdown } from '@/components/markdown/lite-markdown'

const BASE_HEAD_SIZE = 10
const HEAD_SCALE = 1.5
const TIP_FACTOR = 0.95           // tip at 95% of viewBox width → no clipping
const BASE_X_FACTOR = 0.25        // base is at 25% of width (where shaft meets head)
const BASE_THICKNESS_BOOST = 1.1  // bottom side slightly thicker
const ARROW_CLEARANCE_FACTOR = 1 // pull heads farther from node surface

function markerId(edgeId: string, which: 'start' | 'end'): string {
  return `edge-${edgeId}-${which}-marker`
}

function markerOrient(which: 'start' | 'end'): 'auto-start-reverse' | 'auto' {
  return which === 'start' ? 'auto-start-reverse' : 'auto'
}

/**
 * Simple triangle path, pointing to +X, with a clear bottom:
 *
 * baseX   = where shaft meets head (vertical line)
 * tipX    = arrow tip (slightly inside viewBox)
 * topY    = upper base point
 * bottomY = lower base point
 */
function trianglePath(size: number): { d: string, baseX: number, tipX: number } {
  const tipX = size * TIP_FACTOR
  const baseX = size * BASE_X_FACTOR
  const topY = size * 0.1
  const bottomY = size * 0.9

  const d = [
    `M ${baseX} ${topY}`,
    `L ${tipX} ${size / 2}`,
    `L ${baseX} ${bottomY}`,
    `Z`
  ].join(' ')

  return { d, baseX, tipX }
}

/**
 * Barb is an open V (no bottom), sides a bit longer than the triangle.
 */
function barbPaths(size: number): { p1: string, p2: string } {
  const tipX = size * TIP_FACTOR
  const baseX = size * BASE_X_FACTOR
  const topY = size * 0.05
  const bottomY = size * 0.95
  const midY = size / 2

  const p1 = `M ${baseX} ${topY} L ${tipX} ${midY}`
  const p2 = `M ${tipX} ${midY} L ${baseX} ${bottomY}`

  return { p1, p2 }
}

function cssDashArray(style: LinkStyle | undefined, strokeWidth: number): string | undefined {
  if (!style) return undefined
  const sw = Math.max(0.5, strokeWidth)
  if (style.strokeStyle === 'dashed') return `${5.5 * sw} ${4 * sw}`
  if (style.strokeStyle === 'dotted') return `0 ${3 * sw}`
  return undefined
}

type EdgeLabelEditingData = {
  labelEditing?: boolean
  labelDraft?: string
  onLabelChange?: (value: string) => void
  onLabelSave?: () => void
  onLabelCancel?: () => void
}

export const EdgeView = memo(function EdgeView({
  id,
  source,
  target,
  style = {},
  data,
  selected
}: EdgeProps<LinkEdge>): ReactElement | null {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  const linkStyle = (data?.style ?? undefined) as LinkStyle | undefined

  const baseStroke = linkStyle?.strokeColor ?? '#333333'
  const displayStroke = useMemo(() => {
    if (!isDark) return baseStroke
    return darkModeDisplayHex(baseStroke) ?? '#a5c9ff'
  }, [isDark, baseStroke])

  const strokeWidth = linkStyle?.strokeWidth ?? 1.5

  const startKind = (linkStyle?.sourceArrowhead ?? 'none') as ArrowheadType
  const endKind = (linkStyle?.targetArrowhead ?? 'none') as ArrowheadType
  const startMarkerId = startKind !== 'none' ? markerId(id, 'start') : undefined
  const endMarkerId = endKind !== 'none' ? markerId(id, 'end') : undefined

  // visual arrow length in px (tip to base)
  const headSize = BASE_HEAD_SIZE * HEAD_SCALE
  const arrowLength = headSize * (TIP_FACTOR - BASE_X_FACTOR)
  // pull endpoints back so head sits off the node (scaled with head length)
  const arrowOffset = arrowLength * ARROW_CLEARANCE_FACTOR

  const geom = useMemo(() => {
    if (!sourceNode || !targetNode) return null

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode)

    // base connection points from RF
    let sxAdj = sx
    let syAdj = sy
    let txAdj = tx
    let tyAdj = ty

    // vector from source → target
    const dx = tx - sx
    const dy = ty - sy
    const len = Math.hypot(dx, dy) || 1

    const ux = dx / len
    const uy = dy / len

    const hasSourceHead = startKind !== 'none'
    const hasTargetHead = endKind !== 'none'

    // if we have arrow / barb on that side → pull point back along the edge
    if (hasSourceHead) {
      sxAdj += ux * arrowOffset
      syAdj += uy * arrowOffset
    }

    if (hasTargetHead) {
      txAdj -= ux * arrowOffset
      tyAdj -= uy * arrowOffset
    }

    const common = {
      sourceX: sxAdj,
      sourceY: syAdj,
      sourcePosition: sourcePos,
      targetX: txAdj,
      targetY: tyAdj,
      targetPosition: targetPos
    }

    const pathKind = linkStyle?.pathStyle ?? 'bezier'

    let edgePath: string
    let labelX: number
    let labelY: number

    if (pathKind === 'straight') {
      ;[edgePath, labelX, labelY] = getStraightPath(common)
    } else if (pathKind === 'polyline') {
      ;[edgePath, labelX, labelY] = getSmoothStepPath(common)
    } else {
      ;[edgePath, labelX, labelY] = getSimpleBezierPath(common)
    }

    return { sx: sxAdj, sy: syAdj, tx: txAdj, ty: tyAdj, edgePath, labelX, labelY }
  }, [sourceNode, targetNode, linkStyle?.pathStyle, startKind, endKind, arrowOffset])

  const dashArray = useMemo(() => cssDashArray(linkStyle, strokeWidth), [linkStyle, strokeWidth])

  const edgeStrokeStyle: CSSProperties = useMemo(
    (): CSSProperties => ({
      ...(style as CSSProperties),
      stroke: displayStroke,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: 'none',
      strokeDasharray: dashArray
    }),
    [style, displayStroke, strokeWidth, dashArray]
  )

  const filledHeadSize = headSize * 0.95
  const headStrokeWidth = Math.max(1, strokeWidth)

  const edgeExtras = (data ?? {}) as LinkEdge['data'] & EdgeLabelEditingData
  const labelText = edgeExtras?.label?.markdown ?? ''
  const isLabelEditing = Boolean(edgeExtras?.labelEditing)
  const labelDraft = isLabelEditing ? edgeExtras?.labelDraft ?? '' : labelText
  const labelInputRef = useRef<HTMLTextAreaElement | null>(null)
  const skipSaveRef = useRef(false)

  useEffect(() => {
    if (!isLabelEditing) {
      skipSaveRef.current = false
      return
    }
    const raf = requestAnimationFrame(() => {
      labelInputRef.current?.focus()
      labelInputRef.current?.select()
    })
    return () => cancelAnimationFrame(raf)
  }, [isLabelEditing])

  const handleLabelBlur = () => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    edgeExtras.onLabelSave?.()
  }

  if (!geom) return null

  const handleLabelKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      edgeExtras.onLabelSave?.()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      skipSaveRef.current = true
      edgeExtras.onLabelCancel?.()
    }
  }

  const renderMarker = (markerId: string | undefined, kind: ArrowheadType, orient: 'start' | 'end') => {
    if (!markerId || kind === 'none') return null

    const viewBox = `0 0 ${headSize} ${headSize}`
    const refProps = {
      refX: `${headSize * BASE_X_FACTOR}`,
      refY: `${headSize / 2}`,
      markerWidth: headSize,
      markerHeight: headSize,
      markerUnits: 'userSpaceOnUse' as const,
      orient: markerOrient(orient)
    }

    const commonGroupProps = {
      fill: 'none' as const,
      stroke: displayStroke,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const
    }

    if (kind === 'arrow-filled') {
      const { d } = trianglePath(filledHeadSize)
      return (
        <marker id={markerId} viewBox={viewBox} {...refProps}>
          <path
            d={d}
            fill={displayStroke}
            stroke={displayStroke}
            strokeWidth={headStrokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </marker>
      )
    }

    if (kind === 'arrow') {
      const { d, baseX } = trianglePath(headSize)
      const topY = headSize * 0.1
      const bottomY = headSize * 0.9
      return (
        <marker id={markerId} viewBox={viewBox} {...refProps}>
          <g {...commonGroupProps}>
            <path d={d} strokeWidth={headStrokeWidth} fill='none' />
            <path
              d={`M ${baseX} ${bottomY} L ${baseX} ${topY}`}
              strokeWidth={headStrokeWidth * BASE_THICKNESS_BOOST}
            />
          </g>
        </marker>
      )
    }

    const { p1, p2 } = barbPaths(headSize)
    return (
      <marker id={markerId} viewBox={viewBox} {...refProps}>
        <g {...commonGroupProps} strokeWidth={headStrokeWidth}>
          <path d={p1} />
          <path d={p2} />
        </g>
      </marker>
    )
  }

  const selectionHandles = selected ? (
    <>
      <circle
        cx={geom.sx}
        cy={geom.sy}
        r={6}
        className='pointer-events-none stroke-current stroke-2 text-secondary fill-transparent'
      />
      <circle
        cx={geom.tx}
        cy={geom.ty}
        r={6}
        className='pointer-events-none stroke-current stroke-2 text-secondary fill-transparent'
      />
    </>
  ) : null

  return (
    <>
      <svg width='0' height='0' style={{ position: 'absolute' }}>
        <defs>
          {renderMarker(startMarkerId, startKind, 'start')}
          {renderMarker(endMarkerId, endKind, 'end')}
        </defs>
      </svg>

      <BaseEdge
        path={geom.edgePath}
        style={edgeStrokeStyle}
        markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
        markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
      />

      {selectionHandles}

      {(isLabelEditing || !!labelText) && (
        <EdgeLabelRenderer>
          <div
            className='nodrag nopan absolute origin-center pointer-events-auto'
            style={{
              transform: `translate(-50%, -50%) translate(${geom.labelX}px, ${geom.labelY}px)`
            }}
            onPointerDown={event => event.stopPropagation()}
          >
            {isLabelEditing ? (
              <textarea
                ref={labelInputRef}
                value={labelDraft}
                onChange={event => edgeExtras.onLabelChange?.(event.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={handleLabelKeyDown}
                placeholder='Add label...'
                className='text-center text-base px-2 py-1 bg-background focus:outline-none min-w-[160px] resize-none max-w-[240px] font-handwriting'
                rows={1}
              />
            ) : (
              <div className='px-2 py-1 bg-background text-base text-card-foreground max-w-[240px] font-handwriting'>
                <LiteMarkdown text={labelText} />
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
