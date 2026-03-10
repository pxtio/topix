import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ToolsIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"
import { CodeInterpreterChoiceMenu } from "./code-interpreter"
import { ImageGenMenu } from "./image-gen"
import { MemorySearchChoiceMenu } from "./memory-search"
import { SearchEngineChoiceMenu } from "./web-search"

type ToolsMenuProps = {
  memorySearchAvailable?: boolean
}

export const ToolsMenu = ({ memorySearchAvailable = true }: ToolsMenuProps) => {
  const buttonClass = clsx(
    "transition-all shrink-0 my-icon p-2 rounded-full",
    "hover:bg-accent dark:bg-input/30 dark:hover:bg-accent/50",
    "border border-transparent hover:border-border transition-colors",
    "text-muted-foreground"
  )

  return (
    <Popover>
      <Tooltip delayDuration={400}>
        <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50">
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className={buttonClass}
                aria-label="Open tools menu"
              >
                <HugeiconsIcon icon={ToolsIcon} className="size-4 shrink-0" strokeWidth={2} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
        </div>
        <TooltipContent>
          Tools
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="start" side="top" className="w-[220px] p-2">
        <div className="flex flex-col gap-1">
          <SearchEngineChoiceMenu />
          <MemorySearchChoiceMenu available={memorySearchAvailable} />
          <CodeInterpreterChoiceMenu />
          <ImageGenMenu />
        </div>
      </PopoverContent>
    </Popover>
  )
}
