import { useEffect } from "react"
import { useNavigate, useParams, useSearch } from "@tanstack/react-router"

import type { NoteNode } from "../types/flow"
import { nodeCenter } from "../utils/point-attach"

type CenterAroundSearch = { center_around?: string }

/**
 * Centers the board viewport on a node when the `center_around` search param is present.
 * After centering, the param is removed to avoid repeated recentering.
 */
export function useCenterAroundParam({
  nodesById,
  setCenter,
}: {
  nodesById: Map<string, NoteNode>
  setCenter?: (x: number, y: number, options?: { zoom?: number; duration?: number }) => void
}) {
  const navigate = useNavigate()
  const params = useParams({
    from: "/boards/$id",
    select: (p: { id: string }) => p.id,
    shouldThrow: false,
  })
  const search = useSearch({
    from: "/boards/$id",
    select: (s: CenterAroundSearch) => s.center_around,
    shouldThrow: false,
  })

  useEffect(() => {
    if (!search || !setCenter) return
    const node = nodesById.get(search)
    if (!node) return

    const { x, y } = nodeCenter(node)
    setCenter(x, y, { duration: 250 })

    if (!params) return
    navigate({
      to: "/boards/$id",
      params: { id: params },
      replace: true,
      search: (prev: Record<string, unknown>) => {
        if (!prev?.center_around) return prev
        const next = { ...prev }
        delete next.center_around
        return next
      },
    })
  }, [search, nodesById, setCenter, navigate, params])
}
