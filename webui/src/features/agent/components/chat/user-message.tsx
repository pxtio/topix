import { useEffect, useRef } from "react"

/**
 * UserMessage component displays a message sent by the user in the chat interface.
 */
export const UserMessage = ({ message, isLatest }: { message: string, isLatest: boolean }) => {
  const ref = useRef<HTMLDivElement>(null)

  // Scroll this block into view if it's the latest user message
  useEffect(() => {
    if (isLatest && ref.current) {
      ref.current.scrollIntoView({ block: "start" })
    }
  }, [isLatest])
  return (
    <>
      <div className="h-4" ref={ref} />
      <div
        className={`
          flex flex-col gap-2
          w-auto max-w-[75%]
          bg-muted
          text-card-foreground text-base
          text-left
          rounded-xl
          px-5 py-2
          ml-auto
        `}
      >
        {message}
    </div>
    </>
  )
}