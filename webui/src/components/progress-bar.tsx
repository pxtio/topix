import { ShinyText } from "./animations/shiny-text"
import { Orbit } from "./animate-ui/icons/orbit"
import { ListTree } from "lucide-react"

/**
 * ThinkingDots component displays a "Thinking" message with animated dots.
 */
export const ThinkingDots = ({ message, isStopped = false }: { message: string, isStopped?: boolean }) => {
  return (
    <div className="flex flex-row items-center gap-2">
      {
        !isStopped ?
        <Orbit animate animation="path-loop" loop speed={2} className='size-4 text-foreground/50' strokeWidth={1.75} /> :
        <ListTree
          className='size-4 text-foreground/50'
          strokeWidth={1.75}
        />
      }
      <ShinyText text={message} disabled={isStopped} speed={1} className='font-medium text-foreground/50' />
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