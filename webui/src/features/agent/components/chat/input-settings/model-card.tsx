import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import { LlmBrandIcon, LlmDescription, LlmName, type LlmModel } from "@/features/agent/types/llm"
import { SquareLock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"
import { useShallow } from "zustand/shallow"


/**
 * ModelCard is a component that displays the name and description of a LLM model
 * in a hover card format. It is used within the ModelChoiceMenu to provide
 * additional information about each model.
 */
const ModelCard: React.FC<{ model: LlmModel, available?: boolean }> = ({ model, available }) => {
  const clss = clsx(
    "flex-1 flex flex-row items-center gap-2 justify-between truncate",
    available === false ? 'text-muted-foreground cursor-not-allowed pointer-events-none': '',
  )
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger className={clss}>
        <span>{LlmName[model]}</span>
      </HoverCardTrigger>
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

  const availableModels = useChatStore(useShallow((state) => state.services.llm))

  const handleModelChange = (model: LlmModel) => {
    setLlmModel(model)
  }

  return (
    <Select onValueChange={handleModelChange} defaultValue={llmModel}>
      <Tooltip delayDuration={400}>
        <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50 shadow-sm border-input">
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
            availableModels.map((model) => {
              const Icon = LlmBrandIcon[model.name]
              const clName = clsx(
                "relative w-full text-xs flex flex-row items-center gap-2",
                !model.available ? 'text-muted-foreground cursor-not-allowed pointer-events-none' : '',
              )
              return (
                <SelectItem key={model.name} value={model.name} className={clName} disabled={!model.available}>
                  <Icon size={4} />
                  <ModelCard model={model.name} available={model.available} />
                  {
                    !model.available && (
                      <HugeiconsIcon icon={SquareLock01Icon} className='size-4 absolute right-2 top-1/2 -translate-y-1/2' strokeWidth={2} />
                    )
                  }
                </SelectItem>
              )
            })
          }
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}