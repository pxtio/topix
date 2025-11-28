import { Badge } from "@/components/ui/badge"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/features/agent/store/chat-store"
import {
  LlmBadge,
  LlmDescription,
  LlmName,
  type LlmModel,
  LlmFamilyMap,
  LlmFamilyIcon,
  type LlmFamily,
} from "@/features/agent/types/llm"
import { SquareLock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { clsx } from "clsx"
import { useShallow } from "zustand/shallow"

/**
 * Optional: pretty labels for families
 */
const LlmFamilyLabel: Record<LlmFamily, string> = {
  openai: "OpenAI",
  google: "Google Gemini",
  anthropic: "Anthropic Claude",
  mistralai: "Mistral",
  deepseek: "DeepSeek",
  moonshotai: "Moonshot",
}

/**
 * ModelCard is a component that displays the name and description of a LLM model
 * in a hover card format. It is used within the ModelChoiceMenu to provide
 * additional information about each model.
 */
const ModelCard: React.FC<{ model: LlmModel; available?: boolean }> = ({ model, available }) => {
  const clss = clsx(
    "flex-1 flex flex-row items-center gap-2 justify-between truncate",
    available === false ? "text-muted-foreground cursor-not-allowed pointer-events-none" : "",
  )

  const badge = LlmBadge[model]

  const badgeClass = clsx(
    "text-[10px] font-mono font-normal px-1.5 py-0.5 rounded-full border text-muted-foreground bg-transparent border-muted-foreground/20",
  )

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger className={clss}>
        <span className="truncate">{LlmName[model]}</span>
        <Badge variant="outline" className={badgeClass}>
          {badge}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-48 rounded-xl border border-border bg-popover text-popover-foreground shadow text-sm"
        side="left"
        sideOffset={15}
      >
        <div>{LlmDescription[model]}</div>
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

  const availableModels = useChatStore(
    useShallow((state) => state.services.llm),
  )

  const handleModelChange = (value: string) => {
    setLlmModel(value as LlmModel)
  }

  // Group models by family
  const modelsByFamily: Partial<Record<LlmFamily, typeof availableModels>> = {}
  for (const model of availableModels) {
    const family = LlmFamilyMap[model.name]
    if (!family) continue
    if (!modelsByFamily[family]) {
      modelsByFamily[family] = []
    }
    modelsByFamily[family]!.push(model)
  }

  const currentFamily = LlmFamilyMap[llmModel]
  const CurrentFamilyIcon = LlmFamilyIcon[currentFamily]

  return (
    <Select onValueChange={handleModelChange} value={llmModel}>
      <Tooltip delayDuration={400}>
        <div className="rounded-full bg-background backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50 shadow-sm border-input">
          <TooltipTrigger asChild>
            <SelectTrigger className="w-auto rounded-full text-xs px-3 py-2 shadow-none border-none" size="sm">
              <div className="flex items-center gap-2">
                <CurrentFamilyIcon size={16} />
                <span className="truncate">{LlmName[llmModel]}</span>
              </div>
            </SelectTrigger>
          </TooltipTrigger>
        </div>
        <TooltipContent>Core LLM</TooltipContent>
      </Tooltip>

      <SelectContent side="top">
        <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
          <SelectGroup>
            <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Models
            </SelectLabel>
          </SelectGroup>

          {(
            Object.keys(modelsByFamily) as LlmFamily[]
          ).map((family) => {
            const familyModels = modelsByFamily[family]
            if (!familyModels || familyModels.length === 0) return null

            const FamilyIcon = LlmFamilyIcon[family]

            return (
              <SelectGroup key={family} className="mt-1">
                <SelectLabel className="flex flex-row items-center gap-2 text-xs font-medium">
                  <FamilyIcon size={16} />
                  <span>{LlmFamilyLabel[family]}</span>
                </SelectLabel>

                {familyModels.map((model) => {
                  const clName = clsx(
                    "relative w-full text-xs flex flex-row items-center gap-2 py-1.5",
                    !model.available
                      ? "text-muted-foreground cursor-not-allowed pointer-events-none"
                      : "",
                  )

                  return (
                    <SelectItem
                      key={model.name}
                      value={model.name}
                      className={clName}
                      disabled={!model.available}
                    >
                      <ModelCard model={model.name} available={model.available} />
                      {!model.available && (
                        <HugeiconsIcon
                          icon={SquareLock01Icon}
                          className="size-4 absolute right-2 top-1/2 -translate-y-1/2"
                          strokeWidth={2}
                        />
                      )}
                    </SelectItem>
                  )
                })}
              </SelectGroup>
            )
          })}
        </div>
      </SelectContent>
    </Select>
  )
}