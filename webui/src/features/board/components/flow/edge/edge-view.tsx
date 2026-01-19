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
  cssDashArray,
  extractQuadraticSegment,
  pointOnQuadratic,
  quadraticPath,
} from './edge-geometry'
import { useEdgeGeometry } from './use-edge-geometry'
import { useControlPointDrag } from './use-control-point-drag'
import {
  BASE_HEAD_SIZE,
  HEAD_SCALE,
  TIP_FACTOR,
  BASE_X_FACTOR,
  getMarkerId,
} from './edge-markers'

const ARROW_CLEARANCE_FACTOR = 0.5 // pull heads farther from node surface

type EdgeControlPointHandlers = {
  onControlPointChange?: (point: Point) => void
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


/**
 * Renders an edge between two nodes, with optional arrowheads, label, and control point.
 */
export const EdgeView = memo(function EdgeView({
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
  const attachedSourceId = (sourceNode?.data as { attachedToNodeId?: string } | undefined)?.attachedToNodeId
  const attachedTargetId = (targetNode?.data as { attachedToNodeId?: string } | undefined)?.attachedToNodeId
  const attachedSourceNode = useInternalNode(attachedSourceId || '')
  const attachedTargetNode = useInternalNode(attachedTargetId || '')
  const [bendPointDrag, setBendPointDrag] = useState<Point | null>(null)
  const [labelSize, setLabelSize] = useState<{ width: number; height: number } | null>(null)

  const edgeExtras = (data ?? {}) as EdgeRenderData

  const edgeData = useMemo(() => {
    const controlPoint = edgeExtras.properties?.edgeControlPoint?.position
    return {
      linkStyle: edgeExtras.style ?? undefined,
      label: edgeExtras.label,
      labelEditing: edgeExtras.labelEditing,
      labelDraft: edgeExtras.labelDraft,
      onControlPointChange: edgeExtras.onControlPointChange,
      onLabelChange: edgeExtras.onLabelChange,
      onLabelSave: edgeExtras.onLabelSave,
      onLabelCancel: edgeExtras.onLabelCancel,
      controlPoint: isFinitePoint(controlPoint) ? controlPoint : null,
    }
  }, [edgeExtras.properties?.edgeControlPoint?.position, edgeExtras.style, edgeExtras.label, edgeExtras.labelEditing, edgeExtras.labelDraft, edgeExtras.onControlPointChange, edgeExtras.onLabelChange, edgeExtras.onLabelSave, edgeExtras.onLabelCancel])

  const linkStyle = edgeData.linkStyle as LinkStyle | undefined

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
  const startMarkerId = startKind !== 'none'
    ? getMarkerId(startKind, displayStroke, strokeWidth, 'start')
    : undefined
  const endMarkerId = endKind !== 'none'
    ? getMarkerId(endKind, displayStroke, strokeWidth, 'end')
    : undefined

  // visual arrow length in px (tip to base)
  const headSize = BASE_HEAD_SIZE * HEAD_SCALE
  const arrowLength = headSize * (TIP_FACTOR - BASE_X_FACTOR)
  // pull endpoints back so head sits off the node (scaled with head length)
  const arrowOffset = arrowLength * ARROW_CLEARANCE_FACTOR + 6

  const pathStyle = linkStyle?.pathStyle ?? 'bezier'
  const isBezierPath = pathStyle === 'bezier'

  const storedBendPoint = edgeData.controlPoint

  const {
    geom,
    pathData,
    renderedStart,
    renderedEnd,
    insideSegments,
    bezierPoints,
    displayBendPoint,
    isInvalid
  } = useEdgeGeometry({
    sourceNode,
    targetNode,
    sourceClipNode: attachedSourceNode || undefined,
    targetClipNode: attachedTargetNode || undefined,
    linkStyle,
    startKind,
    endKind,
    arrowOffset,
    isBezierPath,
    bendPointDrag,
    storedBendPoint
  })

  const dashArray = useMemo(() => cssDashArray(linkStyle, strokeWidth), [linkStyle, strokeWidth])
  const hiddenDashArray = useMemo(() => {
    const sw = Math.max(0.5, strokeWidth)
    return `0 ${3 * sw}`
  }, [strokeWidth])

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

  const labelText = edgeData.label?.markdown ?? ''
  const hasLabel = Boolean(labelText)
  const isLabelEditing = Boolean(edgeData.labelEditing)
  const labelDraft = isLabelEditing ? edgeData.labelDraft ?? '' : labelText
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
    edgeData.onLabelSave?.()
  }

  const labelTransformStyle = pathData
    ? { transform: `translate(-50%, -50%) translate(${pathData.labelX}px, ${pathData.labelY}px)` }
    : null

  const handleLabelKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      edgeData.onLabelSave?.()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      skipSaveRef.current = true
      edgeData.onLabelCancel?.()
    }
  }

  const { dragPoint: controlPointDrag, handlePointerDown: handleControlPointPointerDown } =
    useControlPointDrag({
      screenToFlowPosition,
      onCommit: edgeData.onControlPointChange,
    })

  useEffect(() => {
    if (controlPointDrag) {
      setBendPointDrag(controlPointDrag)
      return
    }
    setBendPointDrag(null)
  }, [controlPointDrag])

  const labelGapPaths = useMemo(() => {
    if (!pathData || !bezierPoints) return null
    if (!labelSize || (!hasLabel && !isLabelEditing)) return null

    const padding = 6
    const rectX = pathData.labelX - labelSize.width / 2 - padding
    const rectY = pathData.labelY - labelSize.height / 2 - padding
    const rectW = labelSize.width + padding * 2
    const rectH = labelSize.height + padding * 2

    const inside = (p: Point) =>
      p.x >= rectX && p.x <= rectX + rectW && p.y >= rectY && p.y <= rectY + rectH

    const samples = 60
    let t0: number | null = null
    let t1: number | null = null
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples
      const p = pointOnQuadratic(bezierPoints.p0, bezierPoints.p1, bezierPoints.p2, t)
      if (inside(p)) {
        if (t0 === null) t0 = t
        t1 = t
      }
    }

    if (t0 === null || t1 === null || t1 - t0 < 1e-3) return null

    const first = t0 > 1e-3
      ? (() => {
          const seg = extractQuadraticSegment(bezierPoints.p0, bezierPoints.p1, bezierPoints.p2, 0, t0)
          return quadraticPath(seg.p0, seg.p1, seg.p2)
        })()
      : null
    const second = t1 < 1 - 1e-3
      ? (() => {
          const seg = extractQuadraticSegment(bezierPoints.p0, bezierPoints.p1, bezierPoints.p2, t1, 1)
          return quadraticPath(seg.p0, seg.p1, seg.p2)
        })()
      : null

    return {
      first: first?.path ?? null,
      second: second?.path ?? null
    }
  }, [pathData, bezierPoints, labelSize, hasLabel, isLabelEditing])

  if (!geom || !pathData || !renderedStart || !renderedEnd || !labelTransformStyle || isInvalid) {
    return null
  }

  const showControlPoint =
    isBezierPath &&
    !!displayBendPoint &&
    !!edgeData.onControlPointChange &&
    selected &&
    !isLabelEditing

  return (
    <>
      {labelGapPaths ? (
        <>
          <BaseEdge
            path={pathData.path}
            style={{
              ...edgeStrokeStyle,
              stroke: 'transparent',
              strokeDasharray: undefined,
              strokeWidth: Math.max(strokeWidth, 12),
            }}
          />
          {labelGapPaths.first && (
            <path
              d={labelGapPaths.first}
              style={edgeStrokeStyle}
              markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
              pointerEvents="none"
            />
          )}
          {labelGapPaths.second && (
            <path
              d={labelGapPaths.second}
              style={edgeStrokeStyle}
              markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
              pointerEvents="none"
            />
          )}
          {!labelGapPaths.first && labelGapPaths.second && startMarkerId && (
            <path
              d={labelGapPaths.second}
              style={edgeStrokeStyle}
              markerStart={`url(#${startMarkerId})`}
              pointerEvents="none"
            />
          )}
          {!labelGapPaths.second && labelGapPaths.first && endMarkerId && (
            <path
              d={labelGapPaths.first}
              style={edgeStrokeStyle}
              markerEnd={`url(#${endMarkerId})`}
              pointerEvents="none"
            />
          )}
        </>
      ) : (
        <BaseEdge
          path={pathData.path}
          style={edgeStrokeStyle}
          markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
          markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
        />
      )}

      {selected && insideSegments.length > 0 && insideSegments.map((segment, index) => (
        <path
          key={`edge-hidden-${index}`}
          d={segment}
          className='stroke-secondary'
          style={{
            strokeWidth,
            fill: 'none',
            strokeDasharray: hiddenDashArray,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }}
          pointerEvents="none"
        />
      ))}

      {(isLabelEditing || hasLabel) && (
        <EdgeLabel
          labelText={labelText}
          labelColor={displayLabelColor}
          labelDraft={labelDraft}
          isEditing={isLabelEditing}
          onChange={edgeData.onLabelChange}
          onSizeChange={setLabelSize}
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
