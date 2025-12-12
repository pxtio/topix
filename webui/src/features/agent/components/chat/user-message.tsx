import { useEffect, useMemo, useRef, useState } from "react"
import type { ChatMessage } from "../../types/chat"
import { CopyIcon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

/**
 * UserMessage component displays a message sent by the user in the chat interface.
 */
export const UserMessage = ({ message, isLatest }: { message: ChatMessage, isLatest: boolean }) => {
  const ref = useRef<HTMLDivElement>(null)
  const text = message.content.markdown

  const sentLabel = useMemo(() => {
    const timestamp = message.createdAt || message.sentAt
    if (!timestamp) return "Pending…"
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return timestamp
    return date.toLocaleString()
  }, [message.createdAt, message.sentAt])

  // Scroll this block into view if it's the latest user message
  useEffect(() => {
    if (isLatest && ref.current) {
      ref.current.scrollIntoView({ block: "start" })
    }
  }, [isLatest])

  return (
    <>
      <div className="h-4" ref={ref} />
      <div className="relative group w-auto max-w-[75%] min-w-0 ml-auto pb-6">
        <span className="absolute -top-8 right-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-2">
          {sentLabel}
        </span>
        <CopyUserMessageButton
          text={text}
          className="absolute -bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <div
          className={`
            shadow-md
            bg-muted
            text-card-foreground text-base
            text-left
            rounded-xl
            px-5 py-3
            whitespace-pre-wrap break-words
          `}
        >
          {text}
        </div>
      </div>
    </>
  )
}

const CopyUserMessageButton = ({ text, className }: { text: string, className?: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast("Message copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const icon = copied ? Tick01Icon : CopyIcon

  return (
    <button
      className={`transition-all text-xs text-muted-foreground hover:text-foreground flex flex-row items-center gap-2 p-1 rounded-md ${className ?? ""}`}
      onClick={handleCopy}
      type="button"
    >
      <HugeiconsIcon icon={icon} className="size-4 shrink-0" strokeWidth={2} />
      <span>Copy</span>
    </button>
  )
}
