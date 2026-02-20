import { useEffect, useMemo, useRef, useState } from "react"
import type { ChatMessage } from "../../types/chat"
import { CopyIcon, CursorMagicSelection04Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * UserMessage component displays a message sent by the user in the chat interface.
 */
export const UserMessage = ({ message, isLatest }: { message: ChatMessage, isLatest: boolean }) => {
  const ref = useRef<HTMLDivElement>(null)
  const text = message.content.markdown
  const contextText = message.properties.context?.text?.trim()

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
      <div className={`relative group w-auto max-w-[75%] min-w-0 ml-auto ${contextText ? "pb-9" : "pb-6"}`}>
        <span className="absolute -top-8 right-0 block min-w-[150px] text-right text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-2">
          {sentLabel}
        </span>
        <CopyUserMessageButton
          text={text}
          className="absolute -bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
        {contextText && (
          <div className="absolute bottom-3 left-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="opacity-80 hover:opacity-100 transition-opacity"
                  aria-label="Show message context"
                >
                  <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground flex items-center gap-1 px-1.5 py-0.5">
                    <HugeiconsIcon icon={CursorMagicSelection04Icon} className="size-3 shrink-0" strokeWidth={2} />
                    <span>Context</span>
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 max-w-[80vw]">
                <p className="text-xs font-medium text-muted-foreground mb-2">Context used</p>
                <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto scrollbar-thin">
                  {contextText}
                </pre>
              </PopoverContent>
            </Popover>
          </div>
        )}
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
