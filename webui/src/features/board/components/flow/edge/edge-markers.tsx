import { useMemo } from 'react'

import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../../lib/colors/dark-variants'
import type { LinkEdge } from '../../../types/flow'
import type { Link } from '../../../types/link'
import type { ArrowheadType, LinkStyle } from '../../../types/style'
import {
  trianglePath,
  barbPaths,
} from './edge-geometry'

export const BASE_HEAD_SIZE = 10
export const HEAD_SCALE = 1.5
export const TIP_FACTOR = 0.95
export const BASE_X_FACTOR = 0.25
export const BASE_THICKNESS_BOOST = 1.1

type MarkerOrient = 'start' | 'end'

type MarkerDef = {
  kind: ArrowheadType
  stroke: string
  strokeWidth: number
}

const normalizeIdPart = (value: string | number): string =>
  String(value).replace(/[^a-zA-Z0-9_-]/g, '_')

// eslint-disable-next-line react-refresh/only-export-components
export const getMarkerId = (
  kind: ArrowheadType,
  stroke: string,
  strokeWidth: number,
  orient: MarkerOrient,
): string =>
  `edge-marker-${kind}-${normalizeIdPart(stroke)}-${normalizeIdPart(strokeWidth)}-${orient}`

function markerOrient(which: MarkerOrient): 'auto-start-reverse' | 'auto' {
  return which === 'start' ? 'auto-start-reverse' : 'auto'
}

function renderMarker(
  { kind, stroke, strokeWidth }: MarkerDef,
  orient: MarkerOrient,
) {
  if (kind === 'none') return null

  const headSize = BASE_HEAD_SIZE * HEAD_SCALE
  const headStrokeWidth = Math.max(1, strokeWidth)
  const viewBox = `0 0 ${headSize} ${headSize}`
  const refProps = {
    refX: `${headSize * BASE_X_FACTOR}`,
    refY: `${headSize / 2}`,
    markerWidth: headSize,
    markerHeight: headSize,
    markerUnits: 'userSpaceOnUse' as const,
    orient: markerOrient(orient),
  }

  const commonGroupProps = {
    fill: 'none' as const,
    stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  const markerId = getMarkerId(kind, stroke, strokeWidth, orient)

  if (kind === 'arrow-filled') {
    const { d } = trianglePath(headSize * 0.95, TIP_FACTOR, BASE_X_FACTOR)
    return (
      <marker id={markerId} viewBox={viewBox} {...refProps}>
        <path
          d={d}
          fill={stroke}
          stroke={stroke}
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

function computeStroke(linkStyle: LinkStyle | undefined, isDark: boolean): string {
  const baseStroke = linkStyle?.strokeColor ?? '#333333'
  if (!isDark) return baseStroke
  return darkModeDisplayHex(baseStroke) ?? '#a5c9ff'
}

export function EdgeMarkerDefs({ edges }: { edges: LinkEdge[] }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const markers = useMemo(() => {
    const map = new Map<string, MarkerDef>()
    for (const edge of edges) {
      const link = edge.data as Link | undefined
      const style = link?.style
      const strokeWidth = style?.strokeWidth ?? 1.5
      const stroke = computeStroke(style, isDark)
      const startKind = (style?.sourceArrowhead ?? 'none') as ArrowheadType
      const endKind = (style?.targetArrowhead ?? 'none') as ArrowheadType

      if (startKind !== 'none') {
        const key = `${startKind}|${stroke}|${strokeWidth}`
        if (!map.has(key)) {
          map.set(key, { kind: startKind, stroke, strokeWidth })
        }
      }
      if (endKind !== 'none') {
        const key = `${endKind}|${stroke}|${strokeWidth}`
        if (!map.has(key)) {
          map.set(key, { kind: endKind, stroke, strokeWidth })
        }
      }
    }
    return Array.from(map.values())
  }, [edges, isDark])

  if (markers.length === 0) return null

  return (
    <svg width='0' height='0' style={{ position: 'absolute' }}>
      <defs>
        {markers.map((marker) => (
          <g key={`${marker.kind}-${marker.stroke}-${marker.strokeWidth}`}>
            {renderMarker(marker, 'start')}
            {renderMarker(marker, 'end')}
          </g>
        ))}
      </defs>
    </svg>
  )
}
