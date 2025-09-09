import { CodeInterpreterChoiceMenu } from "./code-interpreter"
import { MemorySearchChoiceMenu } from "./memory-search"
import { ModelChoiceMenu } from "./model-card"
import { SearchEngineChoiceMenu } from "./web-search"


/**
 * Component that renders input settings options for a chat interface.
 */
export const InputSettings = () => {
  return (
    <>
      <ModelChoiceMenu />
      <SearchEngineChoiceMenu />
      <MemorySearchChoiceMenu />
      <CodeInterpreterChoiceMenu />
    </>
  )
}