import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select"
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
  const setWebSearchEngine = useChatStore((state) => state.setWebSearchEngine)
  const webSearchEngine = useChatStore((state) => state.webSearchEngine)

  const handleEngineChange = (engine: WebSearchEngine) => {
    setWebSearchEngine(engine)
  }

  return (
    <Select onValueChange={handleEngineChange} defaultValue={webSearchEngine}>
      <SelectTrigger className="h-8 w-auto rounded-full bg-card text-card-foreground border border-border text-xs px-3 shadow-md">
        <Globe className='size-4 shrink-0' strokeWidth={1.75} />
        <span>Web Search</span>
      </SelectTrigger>
      <SelectContent className='overflow-visible'>
        <SelectGroup>
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