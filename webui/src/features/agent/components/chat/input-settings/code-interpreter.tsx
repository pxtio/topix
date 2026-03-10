import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { CodeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import clsx from "clsx"
import { useShallow } from "zustand/shallow"


/**
 * Button component to toggle the Code Interpreter tool in the chat interface.
 */
export const CodeInterpreterChoiceMenu = () => {
  const codeService = useChatStore(useShallow((state) => state.services.code.find((s) => s.name === "openai")))
  const enabledTools = useChatStore(useShallow((state) => state.enabledTools))
  const setEnabledTools = useChatStore((state) => state.setEnabledTools)

  const isEnabled = enabledTools.includes("code_interpreter")
  const isAvailable = codeService?.available || false

  const message = isAvailable ? (isEnabled ? "Disable Code Interpreter" : "Enable Code Interpreter") : "Code Interpreter Unavailable"

  const toggleCodeInterpreter = () => {
    if (isEnabled) {
      setEnabledTools(enabledTools.filter((tool) => tool !== "code_interpreter"))
    } else {
      setEnabledTools([...enabledTools, "code_interpreter"])
    }
  }

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
            onClick={toggleCodeInterpreter}
            aria-label="Toggle Code Interpreter"
            title="Toggle Code Interpreter"
          >
            <HugeiconsIcon icon={CodeIcon} className={iconClass} strokeWidth={2} />
            <span className="text-xs">Code interpreter</span>
          </button>
        </TooltipTrigger>
      </div>
      <TooltipContent>
        {message}
      </TooltipContent>
    </Tooltip>
  )
}
