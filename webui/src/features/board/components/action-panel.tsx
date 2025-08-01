import { Button } from "@/components/ui/button"
import { Square } from "lucide-react"

interface GraphControlPanelProps {
  onAddNode: () => void
}


/**
 * Action panel for the graph view.
 */
export function ActionPanel({ onAddNode }: GraphControlPanelProps) {
  return (
    <div
      className={`
        absolute top-4 left-1/2 -translate-x-1/2 z-10
        bg-card text-card-foreground
        p-4 rounded-xl shadow-md
        flex flex-row items-center justify-center gap-2
      `}
    >
      <Button
        variant={null}
        className={`
          transition-colors
          bg-card text-card-foreground
          hover:bg-accent
          p-4
          rounded-lg
        `}
        size="icon"
        onClick={onAddNode}
      >
        <Square className='size-4 shrink-0' strokeWidth={1.75} />
      </Button>
    </div>
  )
}