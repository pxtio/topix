export const FIRST_MARKER = /<\|\s*[Ff][^|]*\|>/
export const ANY_MARKER = /<\|[^|]*\|>/g

type ReasoningOpts = {
  cleanMarkers?: boolean  // default true: remove any <|...|> inside reasoning
}

/**
 * Extract text BEFORE the first <|F...|> marker.
 * If the marker is absent, returns the whole input (optionally cleaned).
 */
export function extractReasoning(
  text: string,
  opts: ReasoningOpts = { cleanMarkers: true }
): { reasoning: string, hasMarker: boolean } {
  const m = text.match(FIRST_MARKER)
  const clean = (s: string) => opts.cleanMarkers ? s.replace(ANY_MARKER, '') : s

  if (!m) {
    // No marker: treat entire text as reasoning
    return { reasoning: clean(text).trim(), hasMarker: false }
  }

  const end = m.index ?? 0
  const before = text.slice(0, end)
  return { reasoning: clean(before).trimEnd(), hasMarker: true }
}

/**
 * Extract the final segment of a streaming text response.
 */
export function extractFinalSegment(text: string): { final: string, started: boolean } {
  const m = text.match(FIRST_MARKER)
  if (!m) return { final: '', started: false }        // before marker: show nothing while streaming
  const start = (m.index ?? 0) + m[0].length
  const after = text.slice(start).replace(ANY_MARKER, '')
  return { final: after.replace(/^\s+/, ''), started: true }
}
