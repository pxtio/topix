import {
  BaseEdge,
  useInternalNode,
  useReactFlow,
  type EdgeProps
} from '@xyflow/react'
import type { CSSProperties, ReactElement } from 'react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { LinkEdge } from '../../../types/flow'
import type { Link } from '../../../types/link'
import type { ArrowheadType, LinkStyle } from '../../../types/style'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../../lib/colors/dark-variants'
import { EdgeLabel } from './edge-label'
import {
  type Point,
  trianglePath,
  barbPaths,
  cssDashArray,
} from './edge-geometry'
import { useEdgeGeometry } from './use-edge-geometry'

const BASE_HEAD_SIZE = 10
const HEAD_SCALE = 1.5
const TIP_FACTOR = 0.95           // tip at 95% of viewBox width → no clipping
const BASE_X_FACTOR = 0.25        // base is at 25% of width (where shaft meets head)
const BASE_THICKNESS_BOOST = 1.1  // bottom side slightly thicker
const ARROW_CLEARANCE_FACTOR = 0.5 // pull heads farther from node surface

type EdgeControlPointHandlers = {
  onControlPointChange?: (point: Point) => void
}

function markerId(edgeId: string, which: 'start' | 'end'): string {
  return `edge-${edgeId}-${which}-marker`
}

function markerOrient(which: 'start' | 'end'): 'auto-start-reverse' | 'auto' {
  return which === 'start' ? 'auto-start-reverse' : 'auto'
}


type EdgeLabelEditingData = {
  labelEditing?: boolean
  labelDraft?: string
  onLabelChange?: (value: string) => void
  onLabelSave?: () => void
  onLabelCancel?: () => void
}

type EdgeRenderData = Link & EdgeLabelEditingData & EdgeControlPointHandlers

function isFinitePoint(point: Partial<Point> | null | undefined): point is Point {
  return Boolean(
    point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  )
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
  const { screenToFlowPosition } = useReactFlow()

  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  const [bendPointDrag, setBendPointDrag] = useState<Point | null>(null)
  const bendPointDragRef = useRef<Point | null>(null)

  const linkStyle = (data?.style ?? undefined) as LinkStyle | undefined

  const baseStroke = linkStyle?.strokeColor ?? '#333333'
  const baseLabelColor = linkStyle?.textColor ?? '#000000'

  const { displayStroke, displayLabelColor } = useMemo(() => {
    if (!isDark) return { displayStroke: baseStroke, displayLabelColor: baseLabelColor }
    return {
      displayStroke: darkModeDisplayHex(baseStroke) ?? '#a5c9ff',
      displayLabelColor: darkModeDisplayHex(baseLabelColor) ?? '#a5c9ff'
    }
  }, [isDark, baseStroke, baseLabelColor])

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

  const pathStyle = linkStyle?.pathStyle ?? 'bezier'
  const isBezierPath = pathStyle === 'bezier'

  const edgeExtras = (data ?? {}) as EdgeRenderData
  const storedBendPoint = isFinitePoint(edgeExtras.properties?.edgeControlPoint?.position)
    ? edgeExtras.properties?.edgeControlPoint?.position
    : null

  const {
    geom,
    pathData,
    renderedStart,
    renderedEnd,
    displayBendPoint,
    isInvalid
  } = useEdgeGeometry({
    sourceNode,
    targetNode,
    linkStyle,
    startKind,
    endKind,
    arrowOffset,
    isBezierPath,
    bendPointDrag,
    storedBendPoint
  })

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

  const labelTransformStyle = pathData
    ? { transform: `translate(-50%, -50%) translate(${pathData.labelX}px, ${pathData.labelY}px)` }
    : null

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

  if (!geom || !pathData || !renderedStart || !renderedEnd || !labelTransformStyle || isInvalid) {
    return null
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
      const { d } = trianglePath(filledHeadSize, TIP_FACTOR, BASE_X_FACTOR)
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
      const { d, baseX } = trianglePath(headSize, TIP_FACTOR, BASE_X_FACTOR)
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

    const { p1, p2 } = barbPaths(headSize, TIP_FACTOR, BASE_X_FACTOR)
    return (
      <marker id={markerId} viewBox={viewBox} {...refProps}>
        <g {...commonGroupProps} strokeWidth={headStrokeWidth}>
          <path d={p1} />
          <path d={p2} />
        </g>
      </marker>
    )
  }


  const showControlPoint =
    isBezierPath &&
    !!displayBendPoint &&
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

      {(isLabelEditing || hasLabel) && (
        <EdgeLabel
          labelText={labelText}
          labelColor={displayLabelColor}
          labelDraft={labelDraft}
          isEditing={isLabelEditing}
          onChange={edgeExtras.onLabelChange}
          labelInputRef={labelInputRef}
          transformStyle={labelTransformStyle}
          handleLabelBlur={handleLabelBlur}
          handleLabelKeyDown={handleLabelKeyDown}
        />
      )}

      {showControlPoint && (
        <>
          <circle
            cx={displayBendPoint!.x}
            cy={displayBendPoint!.y}
            r={12}
            className='cursor-move fill-transparent'
            pointerEvents='all'
            onPointerDown={handleControlPointPointerDown}
          />
          <circle
            cx={displayBendPoint!.x}
            cy={displayBendPoint!.y}
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
