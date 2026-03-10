import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { AiImageIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"

// Component that allows users to enable or disable the memory search tool
export const ImageGenMenu = () => {
  const { enabledTools, setEnabledTools } = useChatStore()

  const isEnabled = enabledTools.includes("image_generation")

  const handleToggle = () => {
    if (isEnabled) {
      setEnabledTools(enabledTools.filter(tool => tool !== "image_generation"))
    } else {
      setEnabledTools([...enabledTools, "image_generation"])
    }
  }

  const tooltipText = isEnabled ? "Disable Image Generation" : "Enable Image Generation"

  const buttonClass = clsx(
    "transition-all w-full my-icon px-2 py-1.5 rounded-md hover:bg-accent dark:hover:bg-accent/50 border border-transparent hover:border-border transition-colors flex flex-row items-center gap-2 text-left text-muted-foreground"
  )
  const iconClass = clsx(
    "size-4 shrink-0",
    isEnabled ? "text-secondary" : "text-muted-foreground"
  )

  return (
    <Tooltip delayDuration={400}>
      <div className="w-full">
        <TooltipTrigger asChild>
          <button
            className={buttonClass}
            onClick={handleToggle}
          >
            <HugeiconsIcon icon={AiImageIcon} className={iconClass} strokeWidth={2} />
            <span className="text-xs">Image generation</span>
          </button>
        </TooltipTrigger>
      </div>
      <TooltipContent>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}
