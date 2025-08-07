/**
 * ThinkingDots component displays a "Thinking" message with animated dots.
 */
const ThinkingDots = ({ message }: { message: string }) => {
  return (
    <div className="flex items-center gap-2">
      <span>{message}</span>
      <svg aria-hidden="true" className="w-4 h-4 text-muted animate-spin dark:text-foreground fill-foreground" viewBox="0 0 100 101" fill="none">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
      </svg>
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