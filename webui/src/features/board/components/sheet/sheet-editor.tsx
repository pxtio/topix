import { cn } from "@/lib/utils"
import { MilkdownProvider } from "@milkdown/react"
import { MdEditor } from "@/components/editor/milkdown"

type SheetEditorProps = {
  value: string
  onSave: (markdown: string) => void
  className?: string
}

/**
 * Lightweight wrapper around the Milkdown editor for sheet content so it can be
 * reused in dialogs and full-page views.
 */
export const SheetEditor = ({ value, onSave, className }: SheetEditorProps) => {
  return (
    <div
      className={cn("h-full w-full", className)}
      onDoubleClickCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
    >
      <MilkdownProvider>
        <MdEditor markdown={value} onSave={onSave} />
      </MilkdownProvider>
    </div>
  )
}
