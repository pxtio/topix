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
import { RoughSVG } from 'roughjs/bin/svg'
import type { Options as RoughOptions } from 'roughjs/bin/core'
import type { LinkEdge } from '../../types/flow'
import type { ArrowheadType, LinkStyle } from '../../types/style'
import { getEdgeParams } from '../../utils/flow'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'

const BASE_HEAD_SIZE = 10
const HEAD_SCALE = 1.5
const TIP_FACTOR = 0.95           // tip at 95% of viewBox width → no clipping
const BASE_X_FACTOR = 0.25        // base is at 25% of width (where shaft meets head)
const BASE_THICKNESS_BOOST = 1.1  // bottom side slightly thicker

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

function linkStyleToRoughOptions(style: LinkStyle, strokeOverride: string): RoughOptions {
  const base: RoughOptions = {
    roughness: style.roughness ?? 0,
    stroke: strokeOverride,
    strokeWidth: style.strokeWidth ?? 1.5,
    bowing: 1.2,
    preserveVertices: true
  }
  if (style.strokeStyle === 'dashed') return { ...base, strokeLineDash: [6, 6] }
  if (style.strokeStyle === 'dotted') return { ...base, strokeLineDash: [2, 6] }
  return base
}

function shouldUseRough(style?: LinkStyle): boolean {
  if (!style) return false
  return (style.roughness ?? 0) > 0 || style.strokeStyle !== 'solid'
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
  const roughGroupRef = useRef<SVGGElement | null>(null)

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
  // pull endpoints back by ~40% of arrow length so head sits slightly off the node
  const arrowOffset = arrowLength * 0.4

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

  const edgeStrokeStyle: CSSProperties = useMemo(
    (): CSSProperties => ({
      ...(style as CSSProperties),
      stroke: displayStroke,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: 'none'
    }),
    [style, displayStroke, strokeWidth]
  )

  // —— RoughJS render layer ——
  useEffect(() => {
    const g = roughGroupRef.current
    if (!g) return

    while (g.firstChild) g.removeChild(g.firstChild)
    if (!geom || !linkStyle || !shouldUseRough(linkStyle)) return

    const svgEl = g.ownerSVGElement
    if (!svgEl) return

    const rc = new RoughSVG(svgEl)
    const opts = linkStyleToRoughOptions(linkStyle, displayStroke)
    const node = rc.path(geom.edgePath, opts)

    node.setAttribute('stroke-linecap', 'round')
    node.setAttribute('stroke-linejoin', 'round')

    if (startMarkerId) node.setAttribute('marker-start', `url(#${startMarkerId})`)
    if (endMarkerId) node.setAttribute('marker-end', `url(#${endMarkerId})`)

    g.appendChild(node)
  }, [geom, linkStyle, startMarkerId, endMarkerId, displayStroke])

  if (!geom) return null

  const filledHeadSize = headSize * 0.95
  const headStrokeWidth = Math.max(1, strokeWidth)

  return (
    <>
      {/* marker defs */}
      <svg width='0' height='0' style={{ position: 'absolute' }}>
        <defs>
          {startMarkerId && startKind !== 'none' && (
            <marker
              id={startMarkerId}
              viewBox={`0 0 ${headSize} ${headSize}`}
              // line end = center of base
              refX={`${headSize * BASE_X_FACTOR}`}
              refY={`${headSize / 2}`}
              markerWidth={headSize}
              markerHeight={headSize}
              markerUnits='userSpaceOnUse'
              orient={markerOrient('start')}
            >
              {startKind === 'arrow-filled' ? (
                (() => {
                  const { d } = trianglePath(filledHeadSize)
                  return (
                    <path
                      d={d}
                      fill={displayStroke}
                      stroke={displayStroke}
                      strokeWidth={headStrokeWidth}
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  )
                })()
              ) : startKind === 'arrow' ? (
                (() => {
                  const { d, baseX } = trianglePath(headSize)
                  const topY = headSize * 0.1
                  const bottomY = headSize * 0.9
                  return (
                    <g
                      fill='none'
                      stroke={displayStroke}
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      {/* sides */}
                      <path d={d} strokeWidth={headStrokeWidth} fill='none' />
                      {/* base slightly thicker */}
                      <path
                        d={`M ${baseX} ${bottomY} L ${baseX} ${topY}`}
                        strokeWidth={headStrokeWidth * BASE_THICKNESS_BOOST}
                      />
                    </g>
                  )
                })()
              ) : (
                (() => {
                  const { p1, p2 } = barbPaths(headSize)
                  return (
                    <g
                      fill='none'
                      stroke={displayStroke}
                      strokeWidth={headStrokeWidth}
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d={p1} />
                      <path d={p2} />
                    </g>
                  )
                })()
              )}
            </marker>
          )}

          {endMarkerId && endKind !== 'none' && (
            <marker
              id={endMarkerId}
              viewBox={`0 0 ${headSize} ${headSize}`}
              refX={`${headSize * BASE_X_FACTOR}`}
              refY={`${headSize / 2}`}
              markerWidth={headSize}
              markerHeight={headSize}
              markerUnits='userSpaceOnUse'
              orient={markerOrient('end')}
            >
              {endKind === 'arrow-filled' ? (
                (() => {
                  const { d } = trianglePath(filledHeadSize)
                  return (
                    <path
                      d={d}
                      fill={displayStroke}
                      stroke={displayStroke}
                      strokeWidth={headStrokeWidth}
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  )
                })()
              ) : endKind === 'arrow' ? (
                (() => {
                  const { d, baseX } = trianglePath(headSize)
                  const topY = headSize * 0.1
                  const bottomY = headSize * 0.9
                  return (
                    <g
                      fill='none'
                      stroke={displayStroke}
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d={d} strokeWidth={headStrokeWidth} fill='none' />
                      <path
                        d={`M ${baseX} ${bottomY} L ${baseX} ${topY}`}
                        strokeWidth={headStrokeWidth * BASE_THICKNESS_BOOST}
                      />
                    </g>
                  )
                })()
              ) : (
                (() => {
                  const { p1, p2 } = barbPaths(headSize)
                  return (
                    <g
                      fill='none'
                      stroke={displayStroke}
                      strokeWidth={headStrokeWidth}
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d={p1} />
                      <path d={p2} />
                    </g>
                  )
                })()
              )}
            </marker>
          )}
        </defs>
      </svg>

      {shouldUseRough(linkStyle) && <g ref={roughGroupRef} />}

      <BaseEdge
        path={geom.edgePath}
        style={{
          ...edgeStrokeStyle,
          strokeOpacity: shouldUseRough(linkStyle) ? 0.01 : 1
        }}
        markerStart={!shouldUseRough(linkStyle) && startMarkerId ? `url(#${startMarkerId})` : undefined}
        markerEnd={!shouldUseRough(linkStyle) && endMarkerId ? `url(#${endMarkerId})` : undefined}
      />

      {selected && (
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
      )}

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className='nodrag nopan absolute origin-center pointer-events-auto'
            style={{
              transform: `translate(-50%, -50%) translate(${geom.labelX}px, ${geom.labelY}px)`
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})