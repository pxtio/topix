import { CopyAnswer } from "./copy-answer"
import { GenMindmapButton } from "./gen-mindmap"


/**
 * Component that renders action buttons for a chat response.
 */
export const ResponseActions = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-row items-center gap-2">
      <CopyAnswer answer={message} />
      <GenMindmapButton message={message} />
    </div>
  )
}