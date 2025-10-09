import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { MicroscopeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"

// Component that allows users to enable or disable the deep research tool
export const DeepResearchChoiceMenu = () => {
  const useDeepResearch = useChatStore((state) => state.useDeepResearch)
  const setUseDeepResearch = useChatStore((state) => state.setUseDeepResearch)

  const handleToggle = () => {
    setUseDeepResearch(!useDeepResearch)
  }

  const tooltipText = useDeepResearch ? "Disable Deep Research" : "Enable Deep Research"

  const buttonClass = clsx(
    "transition-all shrink-0 my-icon p-2 rounded-full hover:bg-accent dark:bg-input/30 dark:hover:bg-accent/50",
    useDeepResearch ? '!text-secondary' : 'text-muted-foreground'
  )

  return (
    <Tooltip delayDuration={400}>
      <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50">
        <TooltipTrigger asChild>
          <button
            className={buttonClass}
            onClick={handleToggle}
          >
            <HugeiconsIcon icon={MicroscopeIcon} className='size-4 shrink-0' strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
      </div>
      <TooltipContent>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}