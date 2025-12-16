import {
  BaseEdge,
  EdgeLabelRenderer,
  getSimpleBezierPath,
  getStraightPath,
  getSmoothStepPath,
  useInternalNode,
  useReactFlow,
  type EdgeProps
} from '@xyflow/react'
import type { CSSProperties, ReactElement } from 'react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { LinkEdge } from '../../types/flow'
import type { Link } from '../../types/link'
import type { ArrowheadType, LinkStyle } from '../../types/style'
import { getEdgeParams, nodeCenter, pointInNode } from '../../utils/flow'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { LiteMarkdown } from '@/components/markdown/lite-markdown'
import TextareaAutosize from 'react-textarea-autosize'

const BASE_HEAD_SIZE = 10
const HEAD_SCALE = 1.5
const TIP_FACTOR = 0.95           // tip at 95% of viewBox width → no clipping
const BASE_X_FACTOR = 0.25        // base is at 25% of width (where shaft meets head)
const BASE_THICKNESS_BOOST = 1.1  // bottom side slightly thicker
const ARROW_CLEARANCE_FACTOR = 1 // pull heads farther from node surface

type Point = { x: number, y: number }

type EdgeControlPointHandlers = {
  onControlPointChange?: (point: Point) => void
}

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

function quadraticPath(p0: Point, cp: Point, p1: Point): { path: string, labelX: number, labelY: number } {
  const path = `M ${p0.x} ${p0.y} Q ${cp.x} ${cp.y} ${p1.x} ${p1.y}`
  const midX = (p0.x + 2 * cp.x + p1.x) / 4
  const midY = (p0.y + 2 * cp.y + p1.y) / 4
  return { path, labelX: midX, labelY: midY }
}

function bendToControlPoint(bend: Point, start: Point, end: Point): Point {
  return {
    x: 2 * bend.x - 0.5 * (start.x + end.x),
    y: 2 * bend.y - 0.5 * (start.y + end.y),
  }
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

function pointOnQuadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  }
}

function subdivideQuadratic(p0: Point, p1: Point, p2: Point, t: number): {
  first: [Point, Point, Point]
  second: [Point, Point, Point]
} {
  const p01 = lerpPoint(p0, p1, t)
  const p12 = lerpPoint(p1, p2, t)
  const p012 = lerpPoint(p01, p12, t)
  return {
    first: [p0, p01, p012],
    second: [p012, p12, p2],
  }
}

function extractQuadraticSegment(p0: Point, p1: Point, p2: Point, t0: number, t1: number): {
  p0: Point
  p1: Point
  p2: Point
} {
  if (t0 <= 0 && t1 >= 1) {
    return { p0, p1, p2 }
  }

  const clampedT0 = Math.max(0, Math.min(1, t0))
  const clampedT1 = Math.max(clampedT0 + 1e-4, Math.min(1, t1))

  const { second } = subdivideQuadratic(p0, p1, p2, clampedT0)
  const localT = (clampedT1 - clampedT0) / (1 - clampedT0)
  const { first } = subdivideQuadratic(second[0], second[1], second[2], localT)
  return { p0: first[0], p1: first[1], p2: first[2] }
}

function findExitParam(
  node: ReturnType<typeof useInternalNode>,
  getter: (t: number) => Point,
  iterations = 20
): number {
  if (!node) return 0
  let low = 0
  let high = 1
  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2
    const point = getter(mid)
    if (pointInNode(point, node)) {
      low = mid
    } else {
      high = mid
    }
  }
  return high
}

type EdgeLabelEditingData = {
  labelEditing?: boolean
  labelDraft?: string
  onLabelChange?: (value: string) => void
  onLabelSave?: () => void
  onLabelCancel?: () => void
}

type EdgeRenderData = Link & EdgeLabelEditingData & EdgeControlPointHandlers

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
  const { screenToFlowPosition } = useReactFlow()

  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  const [bendPointDrag, setBendPointDrag] = useState<Point | null>(null)
  const bendPointDragRef = useRef<Point | null>(null)

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

  const edgeExtras = (data ?? {}) as EdgeRenderData
  const labelText = edgeExtras?.label?.markdown ?? ''
  const hasLabel = Boolean(labelText)
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

  const storedBendPoint = edgeExtras.properties?.edgeControlPoint?.position
  const sourceCenter = sourceNode ? nodeCenter(sourceNode) : { x: geom.sx, y: geom.sy }
  const targetCenter = targetNode ? nodeCenter(targetNode) : { x: geom.tx, y: geom.ty }
  const fallbackBendPoint: Point = {
    x: (sourceCenter.x + targetCenter.x) / 2,
    y: (sourceCenter.y + targetCenter.y) / 2,
  }
  const displayBendPoint = bendPointDrag ?? storedBendPoint ?? fallbackBendPoint
  const pathStyle = linkStyle?.pathStyle ?? 'bezier'
  const shouldUseControlPoint = pathStyle === 'bezier'
  const useCustomCurve = shouldUseControlPoint && (bendPointDrag !== null || storedBendPoint)

  let pathData: { path: string, labelX: number, labelY: number } = {
    path: geom.edgePath,
    labelX: geom.labelX,
    labelY: geom.labelY,
  }
  let renderedStart: Point = { x: geom.sx, y: geom.sy }
  let renderedEnd: Point = { x: geom.tx, y: geom.ty }

  if (useCustomCurve) {
    const centerControl = bendToControlPoint(displayBendPoint, sourceCenter, targetCenter)
    const pointGetter = (t: number) => pointOnQuadratic(sourceCenter, centerControl, targetCenter, t)
    const startExit = findExitParam(sourceNode, pointGetter)
    const endExit = 1 - findExitParam(targetNode, (t: number) => pointGetter(1 - t))
    const trimmed = extractQuadraticSegment(sourceCenter, centerControl, targetCenter, startExit, endExit)
    renderedStart = trimmed.p0
    renderedEnd = trimmed.p2
    pathData = quadraticPath(trimmed.p0, trimmed.p1, trimmed.p2)
  }

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

  const updateBendPoint = (point: Point | null) => {
    setBendPointDrag(point)
    bendPointDragRef.current = point
  }

  const handleControlPointPointerDown = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!edgeExtras.onControlPointChange) return
    event.stopPropagation()
    event.preventDefault()

    const updateFromEvent = (clientX: number, clientY: number) => {
      const projected = screenToFlowPosition({ x: clientX, y: clientY })
      updateBendPoint(projected)
    }

    const handleMove = (moveEvent: PointerEvent) => {
      updateFromEvent(moveEvent.clientX, moveEvent.clientY)
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      const finalPoint = bendPointDragRef.current
      if (finalPoint) {
        edgeExtras.onControlPointChange?.(finalPoint)
      }
      updateBendPoint(null)
    }

    updateFromEvent(event.clientX, event.clientY)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
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
        cx={renderedStart.x}
        cy={renderedStart.y}
        r={6}
        className='pointer-events-none stroke-current stroke-2 text-secondary fill-transparent'
      />
      <circle
        cx={renderedEnd.x}
        cy={renderedEnd.y}
        r={6}
        className='pointer-events-none stroke-current stroke-2 text-secondary fill-transparent'
      />
    </>
  ) : null

  const showControlPoint =
    shouldUseControlPoint &&
    !!edgeExtras.onControlPointChange &&
    selected &&
    !isLabelEditing

  return (
    <>
      <svg width='0' height='0' style={{ position: 'absolute' }}>
        <defs>
          {renderMarker(startMarkerId, startKind, 'start')}
          {renderMarker(endMarkerId, endKind, 'end')}
        </defs>
      </svg>

      <BaseEdge
        path={pathData.path}
        style={edgeStrokeStyle}
        markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
        markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
      />

      {selectionHandles}

      {(isLabelEditing || hasLabel) && (
        <EdgeLabelRenderer>
          <div
            className='nodrag nopan absolute origin-center pointer-events-auto'
            style={{
              transform: `translate(-50%, -50%) translate(${pathData.labelX}px, ${pathData.labelY}px)`
            }}
            onPointerDown={event => event.stopPropagation()}
          >
            {isLabelEditing ? (
              <TextareaAutosize
                ref={labelInputRef}
                value={labelDraft}
                onChange={event => edgeExtras.onLabelChange?.(event.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={handleLabelKeyDown}
                placeholder='Add label...'
                className='text-center text-base px-2 py-1 bg-background focus:outline-none min-w-[160px] resize-none max-w-[240px] font-handwriting'
                minRows={1}
                maxRows={4}
              />
            ) : (
              <div className='text-center px-2 py-1 bg-background text-base text-card-foreground max-w-[240px] font-handwriting'>
                <LiteMarkdown text={labelText} />
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}

      {showControlPoint && (
        <>
          <circle
            cx={displayBendPoint.x}
            cy={displayBendPoint.y}
            r={12}
            className='cursor-move fill-transparent'
            pointerEvents='all'
            onPointerDown={handleControlPointPointerDown}
          />
          <circle
            cx={displayBendPoint.x}
            cy={displayBendPoint.y}
            r={6}
            className='cursor-move fill-background stroke-secondary stroke-2'
            pointerEvents='all'
            onPointerDown={handleControlPointPointerDown}
          />
        </>
      )}
    </>
  )
})
