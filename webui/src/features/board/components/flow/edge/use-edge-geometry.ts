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
import {
  getEdgeParamsFromGeometry,
  nodeCenterFromGeometry,
  toNodeGeometry
} from '../../../utils/flow'
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
  insideSegments: string[]
  displayBendPoint: Point | null
  isInvalid: boolean
}

type Params = {
  sourceNode: InternalNode<Node> | undefined
  targetNode: InternalNode<Node> | undefined
  sourceClipNode?: InternalNode<Node>
  targetClipNode?: InternalNode<Node>
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
  sourceClipNode,
  targetClipNode,
  linkStyle,
  startKind,
  endKind,
  arrowOffset,
  isBezierPath,
  bendPointDrag,
  storedBendPoint
}: Params): GeometryResult {
  const sourceGeom = useMemo(
    () => (sourceNode ? toNodeGeometry(sourceNode) : null),
    [sourceNode],
  )
  const targetGeom = useMemo(
    () => (targetNode ? toNodeGeometry(targetNode) : null),
    [targetNode],
  )
  const sourceClipGeom = useMemo(
    () => (sourceClipNode ? toNodeGeometry(sourceClipNode) : null),
    [sourceClipNode],
  )
  const targetClipGeom = useMemo(
    () => (targetClipNode ? toNodeGeometry(targetClipNode) : null),
    [targetClipNode],
  )

  const geom = useMemo(() => {
    if (!sourceGeom || !targetGeom) return null
    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParamsFromGeometry(sourceGeom, targetGeom)

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
  }, [sourceGeom, targetGeom, linkStyle?.pathStyle, startKind, endKind, arrowOffset])

  const sourceCenter = useMemo(() => {
    if (sourceGeom) return nodeCenterFromGeometry(sourceGeom)
    if (!geom) return null
    return { x: geom.sx, y: geom.sy }
  }, [sourceGeom, geom])

  const targetCenter = useMemo(() => {
    if (targetGeom) return nodeCenterFromGeometry(targetGeom)
    if (!geom) return null
    return { x: geom.tx, y: geom.ty }
  }, [targetGeom, geom])

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
    if (!geom) {
      return {
        pathData: null,
        renderedStart: null,
        renderedEnd: null,
        insideSegments: [],
        displayBendPoint: null,
        isInvalid: true
      }
    }

    let pathData: { path: string, labelX: number, labelY: number } | null = null
    let renderedStart: Point | null = null
    let renderedEnd: Point | null = null
    const insideSegments: string[] = []
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
        const clipSource = sourceClipGeom ?? sourceGeom ?? null
        const clipTarget = targetClipGeom ?? targetGeom ?? null
        const startExit = findExitParam(clipSource, pointGetter)
        const endExit = 1 - findExitParam(clipTarget, (t: number) => pointGetter(1 - t))
        const trimmed = extractQuadraticSegment(sourceCenter, centerControl, targetCenter, startExit, endExit)
        const hasSourceClip = Boolean(clipSource)
        const hasTargetClip = Boolean(clipTarget)
        const minGap = 1e-3

        if (hasSourceClip && startExit > minGap && startExit < endExit) {
          const hiddenStart = extractQuadraticSegment(sourceCenter, centerControl, targetCenter, 0, startExit)
          insideSegments.push(quadraticPath(hiddenStart.p0, hiddenStart.p1, hiddenStart.p2).path)
        }

        if (hasTargetClip && endExit < 1 - minGap && endExit > startExit) {
          const hiddenEnd = extractQuadraticSegment(sourceCenter, centerControl, targetCenter, endExit, 1)
          insideSegments.push(quadraticPath(hiddenEnd.p0, hiddenEnd.p1, hiddenEnd.p2).path)
        }

        const startPoint = startKind !== 'none'
          ? shiftPointAlong(trimmed.p0, trimmed.p1, arrowOffset)
          : trimmed.p0

        const endPoint = endKind !== 'none'
          ? shiftPointAlong(trimmed.p2, trimmed.p1, arrowOffset)
          : trimmed.p2

        renderedStart = startPoint
        renderedEnd = endPoint

        pathData = quadraticPath(startPoint, trimmed.p1, endPoint)
      }
    } else {
      renderedStart = { x: geom.sx, y: geom.sy }
      renderedEnd = { x: geom.tx, y: geom.ty }
      pathData = { path: geom.edgePath, labelX: geom.labelX, labelY: geom.labelY }
    }

    return { pathData, renderedStart, renderedEnd, insideSegments, displayBendPoint, isInvalid }
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
    sourceGeom,
    targetGeom,
    sourceClipGeom,
    targetClipGeom
  ])

  return {
    geom,
    ...geometryResult,
  }
}
