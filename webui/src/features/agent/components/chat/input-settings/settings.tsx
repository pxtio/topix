import { useListAvailableServices } from "@/features/agent/api/list-available-services"
import { CodeInterpreterChoiceMenu } from "./code-interpreter"
import { DeepResearchChoiceMenu } from "./deep-research"
import { MemorySearchChoiceMenu } from "./memory-search"
import { ModelChoiceMenu } from "./model-card"
import { SearchEngineChoiceMenu } from "./web-search"


/**
 * Component that renders input settings options for a chat interface.
 */
export const InputSettings = () => {
  useListAvailableServices()

  return (
    <>
      <ModelChoiceMenu />
      <SearchEngineChoiceMenu />
      <MemorySearchChoiceMenu />
      <CodeInterpreterChoiceMenu />
      <DeepResearchChoiceMenu />
    </>
  )
}