import { IdeaIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loader2 } from "lucide-react"

/**
 * ThinkingDots component displays a "Thinking" message with animated dots.
 */
export const ThinkingDots = ({ message, isStopped = false }: { message: string, isStopped?: boolean }) => {
  return (
    <div className="flex flex-row items-center gap-2">
      <HugeiconsIcon
        icon={IdeaIcon}
        className='size-5'
      />
      <span>{message}</span>
      {
        !isStopped && <Loader2 className='size-4 animate-spin [animation-duration:750ms]' />
      }
    </div>
  )
}


/**
 * Interface for the properties of the ProgressBar component.
 *
 * @property estimatedTime - The estimated time for the operation in seconds.
 * @property message - An optional message to display alongside the progress bar.
 */
export interface ProgressBarProps {
  message?: string
  viewMode?: "full" | "compact"
}


/**
 * ProgressBar component that displays a progress bar with an estimated time and an optional message.
 */
export const ProgressBar = ({ message, viewMode = "compact" }: ProgressBarProps) => {
  const className = "z-30 flex flex-col items-center justify-center gap-2 p-4 bg-card text-card-foreground " + (viewMode === "full" ? " w-full h-full border-none" : " w-64 border border-border rounded-xl shadow-lg")

  return (
    <>
      <div className={className}>
        {
          message &&
          <div className="text-medium text-xs text-center">
            <ThinkingDots message={message} />
          </div>
        }
      </div>
    </>
  )
}