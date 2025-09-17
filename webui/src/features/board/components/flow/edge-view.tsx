import {
  BaseEdge,
  EdgeLabelRenderer,
  getSimpleBezierPath,
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
import { useDebouncedCallback } from 'use-debounce'
import { DEBOUNCE_DELAY } from '../../const'
import { useAppStore } from '@/store'
import { useGraphStore } from '../../store/graph-store'
import { useUpdateLink } from '../../api/update-link'

function markerId(edgeId: string, which: 'start' | 'end'): string {
  return `edge-${edgeId}-${which}-marker`
}

function markerOrient(which: 'start' | 'end'): 'auto-start-reverse' | 'auto' {
  return which === 'start' ? 'auto-start-reverse' : 'auto'
}

function markerPath(kind: Exclude<ArrowheadType, 'none'>, size: number): string {
  if (kind === 'barb') return `M 0 0 L ${size} ${size / 2} L 0 ${size}`
  return `M 0 0 L ${size} ${size / 2} L 0 ${size} Z`
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

  const geom = useMemo(() => {
    if (!sourceNode || !targetNode) return null
    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode)
    const [edgePath, labelX, labelY] = getSimpleBezierPath({
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sourcePos,
      targetX: tx,
      targetY: ty,
      targetPosition: targetPos
    })
    return { sx, sy, tx, ty, edgePath, labelX, labelY }
  }, [sourceNode, targetNode])

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

  const edgeStrokeStyle: CSSProperties = useMemo((): CSSProperties => ({
    ...(style as CSSProperties),
    stroke: displayStroke,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none'
  }), [style, displayStroke, strokeWidth])

  // —— Debounced persistence (like NodeView) ——
  const userId = useAppStore(state => state.userId)
  const boardId = useGraphStore(state => state.boardId)
  const { updateLink } = useUpdateLink()

  const persist = useDebouncedCallback(() => {
    if (boardId && userId && data) {
      updateLink({ boardId, userId, linkId: id, linkData: data })
    }
  }, DEBOUNCE_DELAY)

  useEffect(() => { persist() }, [persist, data])

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
    if (startMarkerId) node.setAttribute('marker-start', `url(#${startMarkerId})`)
    if (endMarkerId) node.setAttribute('marker-end', `url(#${endMarkerId})`)
    g.appendChild(node)
  }, [geom, linkStyle, startMarkerId, endMarkerId, displayStroke])

  if (!geom) return null

  const headSize = 10
  const headStrokeWidth = Math.max(1, strokeWidth * 0.9)

  return (
    <>
      <svg width='0' height='0' style={{ position: 'absolute' }}>
        <defs>
          {startMarkerId && startKind !== 'none' && (
            <marker
              id={startMarkerId}
              viewBox={`0 0 ${headSize} ${headSize}`}
              refX={`${headSize * 0.9}`}
              refY={`${headSize / 2}`}
              markerWidth={headSize}
              markerHeight={headSize}
              markerUnits='strokeWidth'
              orient={markerOrient('start')}
            >
              {startKind === 'arrow-filled' ? (
                <path d={markerPath('arrow-filled', headSize)} fill={displayStroke} stroke='none' />
              ) : startKind === 'arrow' ? (
                <path
                  d={markerPath('arrow', headSize)}
                  fill='none'
                  stroke={displayStroke}
                  strokeWidth={headStrokeWidth}
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              ) : (
                <path
                  d={markerPath('barb', headSize)}
                  fill='none'
                  stroke={displayStroke}
                  strokeWidth={headStrokeWidth}
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              )}
            </marker>
          )}

          {endMarkerId && endKind !== 'none' && (
            <marker
              id={endMarkerId}
              viewBox={`0 0 ${headSize} ${headSize}`}
              refX={`${headSize * 0.9}`}
              refY={`${headSize / 2}`}
              markerWidth={headSize}
              markerHeight={headSize}
              markerUnits='strokeWidth'
              orient={markerOrient('end')}
            >
              {endKind === 'arrow-filled' ? (
                <path d={markerPath('arrow-filled', headSize)} fill={displayStroke} stroke='none' />
              ) : endKind === 'arrow' ? (
                <path
                  d={markerPath('arrow', headSize)}
                  fill='none'
                  stroke={displayStroke}
                  strokeWidth={headStrokeWidth}
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              ) : (
                <path
                  d={markerPath('barb', headSize)}
                  fill='none'
                  stroke={displayStroke}
                  strokeWidth={headStrokeWidth}
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
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
          <circle cx={geom.sx} cy={geom.sy} r={6} className='pointer-events-none stroke-current stroke-2 text-secondary fill-transparent' />
          <circle cx={geom.tx} cy={geom.ty} r={6} className='pointer-events-none stroke-current stroke-2 text-secondary fill-transparent' />
        </>
      )}

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className='nodrag nopan absolute origin-center pointer-events-auto'
            style={{ transform: `translate(-50%, -50%) translate(${geom.labelX}px, ${geom.labelY}px)` }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
