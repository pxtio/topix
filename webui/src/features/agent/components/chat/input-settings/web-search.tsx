import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { WebSearchEngineDescription, WebSearchEngineName, WebSearchEngines, type WebSearchEngine } from "@/features/agent/types/web"
import { InternetIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"


/**
 * Component that displays information about a web search engine.
 */
const SearchEngineCard: React.FC<{ searchEngine: WebSearchEngine | "-1" }> = ({ searchEngine }) => {
  const name = searchEngine === "-1" ? "Disable Web Search" : WebSearchEngineName[searchEngine]
  const description = searchEngine === "-1" ? "Disable the web search tool." : WebSearchEngineDescription[searchEngine]

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger className='flex flex-row items-center gap-2'>
        <span>{name}</span>
      </HoverCardTrigger>
      <HoverCardContent className='w-48 rounded-xl border border-border bg-popover text-popover-foreground shadow text-sm' side="left" sideOffset={15}>
        <div className=''>
          {description}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}


/**
 * Component that allows users to select a web search engine
 */
export const SearchEngineChoiceMenu = () => {
  const webSearchEngine = useChatStore((state) => state.webSearchEngine)
  const setWebSearchEngine = useChatStore((state) => state.setWebSearchEngine)
  const enabledTools = useChatStore((state) => state.enabledTools)
  const setEnabledTools = useChatStore((state) => state.setEnabledTools)

  const handleEngineChange = (engine: WebSearchEngine | "-1") => {
    if (engine === "-1") {
      setEnabledTools(enabledTools.filter(tool => tool !== "web_search"))
      setWebSearchEngine("openai")
    } else {
      if (!enabledTools.includes("web_search")) {
        setEnabledTools([...enabledTools, "web_search"])
      }
      setWebSearchEngine(engine)
    }
  }

  const iconClass = clsx(
    "size-4 shrink-0 my-icon",
    enabledTools.includes("web_search") ? '!text-secondary' : ''
  )

  const defaultValue = enabledTools.includes("web_search") ? webSearchEngine : "-1"

  return (
    <Select onValueChange={handleEngineChange} defaultValue={defaultValue}>
      <Tooltip delayDuration={400}>
        <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50">
          <TooltipTrigger asChild>
            <SelectTrigger className="w-auto rounded-full text-xs p-2 shadow-none border-none hover:bg-accent [&>svg:not(.my-icon)]:hidden" size="sm">
              <HugeiconsIcon icon={InternetIcon} className={iconClass} strokeWidth={2} />
            </SelectTrigger>
          </TooltipTrigger>
        </div>
        <TooltipContent>
          Select Web Search Engine
        </TooltipContent>
      </Tooltip>
      <SelectContent side='top'>
        <SelectGroup className='max-h-[300px]'>
          <SelectLabel>Select Web Search Engine</SelectLabel>
          {
            [...WebSearchEngines, "-1"].map((engine) => (
              <SelectItem key={engine} value={engine} className='text-xs'>
                <SearchEngineCard searchEngine={engine as (WebSearchEngine | "-1")} />
              </SelectItem>
            ))
          }
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}