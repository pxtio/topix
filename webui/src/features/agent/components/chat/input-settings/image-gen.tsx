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
    "transition-all shrink-0 my-icon p-2 rounded-full hover:bg-accent dark:bg-input/30 dark:hover:bg-accent/50 shadow-sm border-input",
    isEnabled ? '!text-secondary' : 'text-muted-foreground'
  )

  return (
    <Tooltip delayDuration={400}>
      <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50">
        <TooltipTrigger asChild>
          <button
            className={buttonClass}
            onClick={handleToggle}
          >
            <HugeiconsIcon icon={AiImageIcon} className='size-4 shrink-0' strokeWidth={2} />
          </button>
        </TooltipTrigger>
      </div>
      <TooltipContent>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}