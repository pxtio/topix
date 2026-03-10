import { useListAvailableServices } from "@/features/agent/api/list-available-services"
import { DeepResearchChoiceMenu } from "./deep-research"
import { ModelChoiceMenu } from "./model-card"
import { MessageBoardContextChoiceMenu } from "./message-board-context"
import { ToolsMenu } from "./tools-menu"


interface InputSettingsProps {
  showBoardContextOption?: boolean
  memorySearchAvailable?: boolean
}


/**
 * Component that renders input settings options for a chat interface.
 */
export const InputSettings = ({
  showBoardContextOption = false,
  memorySearchAvailable = true,
}: InputSettingsProps) => {
  useListAvailableServices()

  return (
    <>
      <ModelChoiceMenu />
      <ToolsMenu memorySearchAvailable={memorySearchAvailable} />
      <DeepResearchChoiceMenu />
      {showBoardContextOption && <MessageBoardContextChoiceMenu />}
    </>
  )
}
