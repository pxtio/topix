import { Button } from "@/components/ui/button"
import clsx from "clsx"
import { Hand, MousePointer2, Square } from "lucide-react"

interface GraphControlPanelProps {
  onAddNode: () => void
  enableSelection: boolean
  setEnableSelection: (mode: boolean) => void
}


/**
 * Action panel for the graph view.
 */
export function ActionPanel({ onAddNode, enableSelection, setEnableSelection }: GraphControlPanelProps) {
  const normalButtonClass = `
    transition-colors
    bg-card text-card-foreground
    hover:bg-accent
    p-4
    rounded-lg
  `

  const activeButtonClass = clsx(
    normalButtonClass,
    'bg-accent text-accent-foreground',
  )

  const selectionModeButtonClass = enableSelection ? activeButtonClass : normalButtonClass

  const dragModeButtonClass = enableSelection ? normalButtonClass : activeButtonClass

  return (
    <div
      className={`
        absolute top-4 left-1/2 -translate-x-1/2 z-10
        bg-card text-card-foreground
        p-1
        rounded-xl shadow-md
        flex flex-row items-center justify-center gap-2
      `}
    >
      <Button
        variant={null}
        size="icon"
        onClick={() => setEnableSelection(!enableSelection)}
        className={dragModeButtonClass}
      >
        <Hand className='size-4 shrink-0' strokeWidth={1.75} />
      </Button>
      <Button
        variant={null}
        size="icon"
        onClick={() => setEnableSelection(!enableSelection)}
        className={selectionModeButtonClass}
      >
        <MousePointer2 className='size-4 shrink-0' strokeWidth={1.75} />
      </Button>
      <Button
        variant={null}
        className={normalButtonClass}
        size="icon"
        onClick={onAddNode}
      >
        <Square className='size-4 shrink-0' strokeWidth={1.75} />
      </Button>
    </div>
  )
}