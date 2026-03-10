import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { ChipIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"
import { useEffect } from "react"

// Component that allows users to enable or disable the memory search tool
export const MemorySearchChoiceMenu = ({ available = true }: { available?: boolean }) => {
  const { enabledTools, setEnabledTools } = useChatStore()

  const isEnabled = enabledTools.includes("memory_search")

  useEffect(() => {
    if (available) return
    if (!isEnabled) return
    setEnabledTools(enabledTools.filter(tool => tool !== "memory_search"))
  }, [available, enabledTools, isEnabled, setEnabledTools])

  const handleToggle = () => {
    if (!available) return
    if (isEnabled) {
      setEnabledTools(enabledTools.filter(tool => tool !== "memory_search"))
    } else {
      setEnabledTools([...enabledTools, "memory_search"])
    }
  }

  const tooltipText = !available
    ? "Attach this chat to a board to enable memory search"
    : (isEnabled ? "Disable Memory Search" : "Enable Memory Search")

  const buttonClass = clsx(
    "transition-all w-full my-icon px-2 py-1.5 rounded-md border border-transparent transition-colors flex flex-row items-center gap-2 text-left text-muted-foreground",
    available ? "hover:bg-accent dark:hover:bg-accent/50 hover:border-border" : "opacity-50 cursor-not-allowed"
  )
  const iconClass = clsx(
    "size-4 shrink-0",
    available && isEnabled ? "text-secondary" : "text-muted-foreground"
  )

  return (
    <Tooltip delayDuration={400}>
      <div className="w-full">
        <TooltipTrigger asChild>
          <button
            className={buttonClass}
            onClick={handleToggle}
            disabled={!available}
          >
            <HugeiconsIcon icon={ChipIcon} className={iconClass} strokeWidth={2} />
            <span className="text-xs">Memory search</span>
          </button>
        </TooltipTrigger>
      </div>
      <TooltipContent>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}
