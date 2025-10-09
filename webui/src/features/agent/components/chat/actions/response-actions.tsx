import { CopyAnswer } from "./copy-answer"
import { SaveAsNote } from "./save-as-note"


/**
 * Component that renders action buttons for a chat response.
 */
export const ResponseActions = ({ message, saveAsIs = false }: { message: string, saveAsIs?: boolean }) => {
  return (
    <div className="flex flex-row items-center gap-2">
      <CopyAnswer answer={message} />
      <SaveAsNote message={message} type="notify" saveAsIs={saveAsIs} />
      <SaveAsNote message={message} type="mapify" />
    </div>
  )
}