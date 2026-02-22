import { Button } from "@/components/ui/button"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"
import { useGetNotePath } from "../../api/get-note-path"


const normalizeLabel = (markdown?: string) => {
  const text = (markdown ?? "").replace(/\s+/g, " ").trim()
  return text || "Untitled"
}


export function FolderBreadcrumb({
  boardId,
  rootId,
}: {
  boardId?: string
  rootId?: string
}) {
  const navigate = useNavigate()
  const { data: path = [] } = useGetNotePath({ boardId, noteId: rootId, enabled: !!rootId })

  const crumbs = useMemo(
    () =>
      path.map(note => ({
        id: note.id,
        label: normalizeLabel(note.label?.markdown),
      })),
    [path],
  )

  if (!boardId || !rootId) return null

  return (
    <div className="absolute top-14 left-2 z-40 max-w-[60vw] rounded-lg border border-border bg-sidebar/90 backdrop-blur px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
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
              {crumb.label}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
