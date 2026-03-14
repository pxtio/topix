import { Button } from "@/components/ui/button"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import { useGetNotePath } from "../../api/get-note-path"
import { useGraphStore } from "../../store/graph-store"


const normalizeLabel = (markdown?: string) => {
  const text = (markdown ?? "").replace(/\s+/g, " ").trim()
  return text || "Untitled"
}


export function FolderBreadcrumb({
  boardId,
  rootId,
  inline = false,
  boardLabel,
}: {
  boardId?: string
  rootId?: string
  inline?: boolean
  boardLabel?: string
}) {
  const navigate = useNavigate()
  const setCurrentFolderDepth = useGraphStore(state => state.setCurrentFolderDepth)
  const setFolderDepthFromPathLength = useGraphStore(state => state.setFolderDepthFromPathLength)
  const { data: path = [] } = useGetNotePath({ boardId, noteId: rootId, enabled: !!rootId })

  const crumbs = useMemo(
    () =>
      path.map(note => ({
        id: note.id,
        label: normalizeLabel(note.label?.markdown),
      })),
    [path],
  )

  useEffect(() => {
    if (!rootId) {
      setCurrentFolderDepth(-1)
      return
    }
    setFolderDepthFromPathLength(path.length)
  }, [path.length, rootId, setCurrentFolderDepth, setFolderDepthFromPathLength])

  if (!boardId || !rootId) return null

  if (inline) {
    return (
      <div className="max-w-[60vw] flex items-center gap-1 overflow-x-auto min-w-0">
        {boardLabel ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-sm font-normal max-w-[200px] truncate hover:underline"
            title={boardLabel}
            onClick={() =>
              navigate({
                to: "/boards/$id",
                params: { id: boardId },
                search: (prev: Record<string, unknown>) => {
                  const next = { ...prev } as Record<string, unknown>
                  delete next.root_id
                  return next
                },
              })
            }
          >
            {boardLabel}
          </Button>
        ) : (
          <>
            <span className="text-muted-foreground text-sm">/</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-sm font-normal hover:underline"
              onClick={() =>
                navigate({
                  to: "/boards/$id",
                  params: { id: boardId },
                  search: (prev: Record<string, unknown>) => {
                    const next = { ...prev } as Record<string, unknown>
                    delete next.root_id
                    return next
                  },
                })
              }
            >
              ...
            </Button>
          </>
        )}

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          const crumbLabel = isLast ? crumb.label : "..."
          return (
            <div key={crumb.id} className="flex items-center gap-1 min-w-0">
              <span className="text-muted-foreground text-sm">/</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-sm font-normal max-w-[180px] truncate hover:underline"
                disabled={isLast}
                onClick={() =>
                  navigate({
                    to: "/boards/$id",
                    params: { id: boardId },
                    search: (prev: Record<string, unknown>) => ({
                      ...prev,
                      root_id: crumb.id,
                    }),
                  })
                }
              >
                {crumbLabel}
              </Button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="max-w-[60vw] rounded-lg border border-border bg-sidebar/90 backdrop-blur px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() =>
          navigate({
            to: "/boards/$id",
            params: { id: boardId },
            search: (prev: Record<string, unknown>) => {
              const next = { ...prev } as Record<string, unknown>
              delete next.root_id
              return next
            },
          })
        }
      >
        Root
      </Button>

      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        const crumbLabel = isLast ? crumb.label : "..."
        return (
          <div key={crumb.id} className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">/</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs max-w-[180px] truncate"
              disabled={isLast}
              onClick={() =>
                navigate({
                  to: "/boards/$id",
                  params: { id: boardId },
                  search: (prev: Record<string, unknown>) => ({
                    ...prev,
                    root_id: crumb.id,
                  }),
                })
              }
            >
              {crumbLabel}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
