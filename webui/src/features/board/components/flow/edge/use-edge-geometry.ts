import { useMemo } from 'react'
import {
  getSimpleBezierPath,
  getStraightPath,
  getSmoothStepPath
} from '@xyflow/react'
import type { ArrowheadType, LinkStyle } from '../../../types/style'
import type { Point } from './edge-geometry'
import {
  bendToControlPoint,
  extractQuadraticSegment,
  findExitParam,
  pointOnQuadratic,
  quadraticPath,
  shiftPointAlong
} from './edge-geometry'
import { getEdgeParams, nodeCenter } from '../../../utils/flow'
import type { Node, InternalNode } from '@xyflow/react'

type GeometryResult = {
  geom: {
    sx: number
    sy: number
    tx: number
    ty: number
    edgePath: string
    labelX: number
    labelY: number
  } | null
  pathData: { path: string; labelX: number; labelY: number } | null
  renderedStart: Point | null
  renderedEnd: Point | null
  displayBendPoint: Point | null
  isInvalid: boolean
}

type Params = {
  sourceNode: InternalNode<Node> | undefined
  targetNode: InternalNode<Node> | undefined
  linkStyle: LinkStyle | undefined
  startKind: ArrowheadType
  endKind: ArrowheadType
  arrowOffset: number
  isBezierPath: boolean
  bendPointDrag: Point | null
  storedBendPoint: Point | null
}

export function useEdgeGeometry({
  sourceNode,
  targetNode,
  linkStyle,
  startKind,
  endKind,
  arrowOffset,
  isBezierPath,
  bendPointDrag,
  storedBendPoint
}: Params): GeometryResult {
  const geom = useMemo(() => {
    if (!sourceNode || !targetNode) return null

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode)

    let sxAdj = sx
    let syAdj = sy
    let txAdj = tx
    let tyAdj = ty

    const dx = tx - sx
    const dy = ty - sy
    const len = Math.hypot(dx, dy) || 1

    const ux = dx / len
    const uy = dy / len

    if (startKind !== 'none') {
      sxAdj += ux * arrowOffset
      syAdj += uy * arrowOffset
    }

    if (endKind !== 'none') {
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

  const sourceCenter = useMemo(() => {
    if (sourceNode) return nodeCenter(sourceNode)
    if (!geom) return null
    return { x: geom.sx, y: geom.sy }
  }, [sourceNode, geom])

  const targetCenter = useMemo(() => {
    if (targetNode) return nodeCenter(targetNode)
    if (!geom) return null
    return { x: geom.tx, y: geom.ty }
  }, [targetNode, geom])

  const fallbackBendPoint: Point | null = useMemo(() => {
    if (!isBezierPath) return null
    if (!sourceCenter || !targetCenter) return null
    const midX = (sourceCenter.x + targetCenter.x) / 2
    const midY = (sourceCenter.y + targetCenter.y) / 2
    const dx = targetCenter.x - sourceCenter.x
    const dy = targetCenter.y - sourceCenter.y
    const len = Math.hypot(dx, dy) || 1
    const normalX = -dy / len
    const normalY = dx / len
    const offset = Math.min(240, Math.max(16, len * 0.16))
    return {
      x: midX + normalX * offset,
      y: midY + normalY * offset
    }
  }, [isBezierPath, sourceCenter, targetCenter])

  const geometryResult = useMemo(() => {
    if (!geom) return { pathData: null, renderedStart: null, renderedEnd: null, displayBendPoint: null, isInvalid: true }

    let pathData: { path: string, labelX: number, labelY: number } | null = null
    let renderedStart: Point | null = null
    let renderedEnd: Point | null = null
    let displayBendPoint: Point | null = null
    let isInvalid = false

    if (isBezierPath) {
      if (!sourceCenter || !targetCenter || !fallbackBendPoint) {
        isInvalid = true
      } else {
        displayBendPoint = bendPointDrag ?? storedBendPoint ?? fallbackBendPoint
        const shouldUseControlPoint = Boolean(bendPointDrag || storedBendPoint)
        const activeBend = shouldUseControlPoint ? displayBendPoint ?? fallbackBendPoint : fallbackBendPoint
        const centerControl = bendToControlPoint(activeBend, sourceCenter, targetCenter)
        const pointGetter = (t: number) => pointOnQuadratic(sourceCenter, centerControl, targetCenter, t)
        const startExit = findExitParam(sourceNode ?? null, pointGetter)
        const endExit = 1 - findExitParam(targetNode ?? null, (t: number) => pointGetter(1 - t))
        const trimmed = extractQuadraticSegment(sourceCenter, centerControl, targetCenter, startExit, endExit)

        renderedStart = trimmed.p0
        renderedEnd = trimmed.p2

        if (startKind !== 'none') {
          renderedStart = shiftPointAlong(trimmed.p0, trimmed.p1, arrowOffset)
        }
        if (endKind !== 'none') {
          renderedEnd = shiftPointAlong(trimmed.p2, trimmed.p1, arrowOffset)
        }

        pathData = quadraticPath(renderedStart, trimmed.p1, renderedEnd)
      }
    } else {
      renderedStart = { x: geom.sx, y: geom.sy }
      renderedEnd = { x: geom.tx, y: geom.ty }
      pathData = { path: geom.edgePath, labelX: geom.labelX, labelY: geom.labelY }
    }

    return { pathData, renderedStart, renderedEnd, displayBendPoint, isInvalid }
  }, [
    geom,
    isBezierPath,
    sourceCenter,
    targetCenter,
    fallbackBendPoint,
    bendPointDrag,
    storedBendPoint,
    startKind,
    endKind,
    arrowOffset,
    sourceNode,
    targetNode
  ])

  return {
    geom,
    ...geometryResult,
  }
}
