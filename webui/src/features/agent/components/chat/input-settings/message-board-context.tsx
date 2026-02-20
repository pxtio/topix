import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { CursorMagicSelection04Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"


export const MessageBoardContextChoiceMenu = () => {
  const enabled = useChatStore((state) => state.enableMessageBoardContextSelection)
  const setEnabled = useChatStore((state) => state.setEnableMessageBoardContextSelection)

  const handleToggle = () => {
    setEnabled(!enabled)
  }

  const tooltipText = enabled
    ? "Disable selected nodes context"
    : "Enable selected nodes context"

  const buttonClass = clsx(
    "transition-all shrink-0 my-icon p-2 rounded-full hover:bg-accent dark:bg-input/30 dark:hover:bg-accent/50 border border-transparent hover:border-border transition-colors",
    enabled ? "!text-secondary" : "text-muted-foreground"
  )

  return (
    <Tooltip delayDuration={400}>
      <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50">
        <TooltipTrigger asChild>
          <button
            className={buttonClass}
            onClick={handleToggle}
            aria-label="Toggle selected nodes context"
          >
            <HugeiconsIcon icon={CursorMagicSelection04Icon} className="size-4 shrink-0" strokeWidth={2} />
          </button>
        </TooltipTrigger>
      </div>
      <TooltipContent>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}
