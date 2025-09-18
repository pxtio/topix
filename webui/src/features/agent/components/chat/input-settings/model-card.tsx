import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { LlmBrandIcon, LlmDescription, LlmModels, LlmName, type LlmModel } from "@/features/agent/types/llm"


/**
 * ModelCard is a component that displays the name and description of a LLM model
 * in a hover card format. It is used within the ModelChoiceMenu to provide
 * additional information about each model.
 */
const ModelCard: React.FC<{ model: LlmModel }> = ({ model }) => {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger className=''>{LlmName[model]}</HoverCardTrigger>
      <HoverCardContent className='w-48 rounded-xl border border-border bg-popover text-popover-foreground shadow text-sm' side="left" sideOffset={15}>
        <div className=''>
          {LlmDescription[model]}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}


/**
 * ModelChoiceMenu is a component that allows users to select an AI model
 * from a dropdown menu. It uses the Select component from the UI library
 * to create a styled dropdown with model options.
 */
export const ModelChoiceMenu = () => {
  const { llmModel, setLlmModel } = useChatStore()

  const handleModelChange = (model: LlmModel) => {
    setLlmModel(model)
  }

  return (
    <Select onValueChange={handleModelChange} defaultValue={llmModel}>
      <Tooltip delayDuration={400}>
        <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50">
          <TooltipTrigger asChild>
            <SelectTrigger className="w-auto rounded-full text-xs p-2 shadow-none border-none" size="sm">
              <SelectValue defaultValue={llmModel} />
            </SelectTrigger>
          </TooltipTrigger>
        </div>
        <TooltipContent>
          Core LLM
        </TooltipContent>
      </Tooltip>
      <SelectContent side='top'>
        <SelectGroup className='max-h-[300px]'>
          <SelectLabel>Models</SelectLabel>
          {
            LlmModels.map((model) => {
              const Icon = LlmBrandIcon[model]
              return (
                <SelectItem key={model} value={model} className='text-xs flex flex-row items-center gap-2'>
                  <Icon size={4} />
                  <ModelCard model={model} />
                </SelectItem>
              )
            })
          }
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}