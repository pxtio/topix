import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { ChipIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"

// Component that allows users to enable or disable the memory search tool
export const MemorySearchChoiceMenu = () => {
  const { enabledTools, setEnabledTools } = useChatStore()

  const isEnabled = enabledTools.includes("memory_search")

  const handleToggle = () => {
    if (isEnabled) {
      setEnabledTools(enabledTools.filter(tool => tool !== "memory_search"))
    } else {
      setEnabledTools([...enabledTools, "memory_search"])
    }
  }

  const tooltipText = isEnabled ? "Disable Memory Search" : "Enable Memory Search"

  const buttonClass = clsx(
    "transition-all shrink-0 my-icon p-2 rounded-full hover:bg-accent dark:bg-input/30 dark:hover:bg-accent/50",
    isEnabled ? '!text-secondary' : 'text-muted-foreground'
  )

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <button
          className={buttonClass}
          onClick={handleToggle}
        >
          <HugeiconsIcon icon={ChipIcon} className='size-4 shrink-0' strokeWidth={1.75} />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}