import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { WebSearchEngineDescription, WebSearchEngineName, WebSearchEngines, type WebSearchEngine } from "@/features/agent/types/web"
import { Globe } from "lucide-react"


/**
 * Component that displays information about a web search engine.
 */
const SearchEngineCard: React.FC<{ searchEngine: WebSearchEngine }> = ({ searchEngine }) => {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger className='flex flex-row items-center gap-2'>
        <span>{WebSearchEngineName[searchEngine]}</span>
      </HoverCardTrigger>
      <HoverCardContent className='w-48 rounded-xl border border-border bg-popover text-popover-foreground shadow text-sm' side="left" sideOffset={15}>
        <div className=''>
          {WebSearchEngineDescription[searchEngine]}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}


/**
 * Component that allows users to select a web search engine
 */
export const SearchEngineChoiceMenu = () => {
  const { webSearchEngine, setWebSearchEngine } = useChatStore()

  const handleEngineChange = (engine: WebSearchEngine) => {
    setWebSearchEngine(engine)
  }

  return (
    <Select onValueChange={handleEngineChange} defaultValue={webSearchEngine}>
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <SelectTrigger className="h-8 w-auto rounded-full bg-card text-card-foreground border border-border text-xs px-3 shadow-md">
            <Globe className='size-4 shrink-0' strokeWidth={1.75} />
            <span>{WebSearchEngineName[webSearchEngine]}</span>
          </SelectTrigger>
        </TooltipTrigger>
        <TooltipContent>
          Web Search Tool
        </TooltipContent>
      </Tooltip>
      <SelectContent side='top'>
        <SelectGroup className='max-h-[300px]'>
          <SelectLabel>Select Web Search Engine</SelectLabel>
          {
            WebSearchEngines.map((engine) => (
              <SelectItem key={engine} value={engine} className='text-xs'>
                <SearchEngineCard searchEngine={engine} />
              </SelectItem>
            ))
          }
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}