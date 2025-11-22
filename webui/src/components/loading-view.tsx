import { ShinyText } from "./animations/shiny-text"
import { Orbit } from "./animate-ui/icons/orbit"
import { ListTree } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import clsx from "clsx"

/**
 * ThinkingDots component displays a "Thinking" message with animated dots.
 */
export const ThinkingDots = ({ message, isStopped = false }: { message: string, isStopped?: boolean }) => {
  return (
    <div className="flex flex-row items-center gap-2">
      {
        !isStopped ?
        <Orbit animate animation="path-loop" loop speed={2} className='size-4 text-foreground/50' strokeWidth={2} /> :
        <ListTree
          className='size-4 text-foreground/50'
          strokeWidth={2}
        />
      }
      {
        !isStopped ? (
          <ShinyText text={message} disabled={isStopped} speed={1} className='font-normal text-sm text-foreground/50' />
        ) : (
          <span className='font-normal text-sm text-foreground/50'>{message}</span>
        )
      }
    </div>
  )
}


/**
 * Interface for the properties of the LoadingWindow component.
 *
 * @property estimatedTime - The estimated time for the operation in seconds.
 * @property message - An optional message to display alongside the loading indicator.
 */
export interface LoadingWindowProps {
  message?: string
  viewMode?: "full" | "compact"
  className?: string
}


/**
 * LoadingWindow component that displays a loading indicator with an optional message.
 */
export const LoadingWindow = ({ message, viewMode = "compact", className = undefined }: LoadingWindowProps) => {
  const clName = clsx(
    "z-30 flex flex-col items-center justify-center gap-2 p-4 bg-card text-card-foreground",
    viewMode === "full" ? "absolute inset-0 z-20 w-full h-full border-none" : " w-64 border border-border rounded-xl shadow-lg",
    className
  )
  return (
    <>
      <div className={clName}>
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

export interface ErrorWindowProps {
  message: string
  viewMode?: "full" | "compact"
  className?: string
}

// ErrorWindow component that displays an error message.
export const ErrorWindow = ({ message, viewMode = "compact", className = undefined }: ErrorWindowProps) => {
  const clName = clsx(
    "z-30 flex flex-col items-center justify-center gap-2 p-4 bg-card text-card-foreground",
    viewMode === "full" ? "absolute inset-0 z-20 w-full h-full border-none" : "w-64 border border-border rounded-xl shadow-lg",
    className
  )

  return (
    <>
      <div className={clName}>
        <div className="text-medium text-xs text-center text-destructive flex flex-row items-center gap-2">
          <HugeiconsIcon icon={Alert02Icon} className='w-4 h-4' strokeWidth={2} />
          <span>{message}</span>
        </div>
      </div>
    </>
  )
}