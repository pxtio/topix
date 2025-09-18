import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { CodeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import clsx from "clsx"


/**
 * Button component to toggle the Code Interpreter tool in the chat interface.
 */
export const CodeInterpreterChoiceMenu = () => {
  const { enabledTools, setEnabledTools } = useChatStore()

  const isEnabled = enabledTools.includes("code_interpreter")

  const toggleCodeInterpreter = () => {
    if (isEnabled) {
      setEnabledTools(enabledTools.filter((tool) => tool !== "code_interpreter"))
    } else {
      setEnabledTools([...enabledTools, "code_interpreter"])
    }
  }

  const buttonClass = clsx(
    "transition-all shrink-0 my-icon p-2 rounded-full hover:bg-accent dark:bg-input/30 dark:hover:bg-accent/50",
    isEnabled ? '!text-secondary' : 'text-muted-foreground'
  )

  return (
    <Tooltip delayDuration={400}>
      <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50">
        <TooltipTrigger asChild>
          <button
            className={buttonClass}
            onClick={toggleCodeInterpreter}
            aria-label="Toggle Code Interpreter"
            title="Toggle Code Interpreter"
          >
            <HugeiconsIcon icon={CodeIcon} className="size-4" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
      </div>
      <TooltipContent>
        {isEnabled ? "Disable Code Interpreter" : "Enable Code Interpreter"}
      </TooltipContent>
    </Tooltip>
  )
}