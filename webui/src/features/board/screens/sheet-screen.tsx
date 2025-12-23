import { useEffect } from "react"
import { useParams } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { SheetEditor } from "../components/sheet/sheet-editor"
import { useGetNote } from "../api/get-note"
import { updateNote } from "../api/update-note"
import { cn } from "@/lib/utils"
import { SheetUrl } from "@/routes"
import { useGraphStore } from "../store/graph-store"

export const SheetScreen = () => {
  const { id: boardId, noteId } = useParams({ from: SheetUrl }) as { id: string; noteId: string }
  const setBoardId = useGraphStore(state => state.setBoardId)

  useEffect(() => {
    setBoardId(boardId)
  }, [boardId, setBoardId])

  const { data: note, isLoading } = useGetNote({ boardId, noteId })

  const mutation = useMutation({
    mutationFn: (markdown: string) =>
      updateNote(boardId, noteId, { content: { markdown } }),
  })

  const handleSave = (markdown: string) => {
    mutation.mutate(markdown)
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className={cn("flex-1 min-h-0 min-w-0 p-4 sm:p-8")}>
        {isLoading || !note ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            Loading sheet...
          </div>
        ) : (
          <div className="h-full w-full rounded-lg bg-background">
            <SheetEditor
              value={note.content?.markdown || ""}
              onSave={handleSave}
              className="h-[calc(100vh-180px)]"
            />
          </div>
        )}
      </div>
    </div>
  )
}
