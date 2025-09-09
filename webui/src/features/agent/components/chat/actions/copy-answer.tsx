import { CopyIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { toast } from "sonner"


/**
 * Button component to copy the assistant's answer to the clipboard.
 */
export const CopyAnswer = ({ answer }: { answer: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(answer).then(() => {
      setCopied(true)
      toast('Answer copied to clipboard!')
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    })
  }

  const icon = copied ? CopyIcon : CopyIcon

  return (
    <button
      className="transition-all text-xs text-muted-foreground/50 hover:text-foreground flex flex-row items-center gap-2 p-1 rounded-md"
      onClick={handleCopy}
    >
      <HugeiconsIcon icon={icon} className='size-4 shrink-0' strokeWidth={1.75} />
      <span>Copy</span>
    </button>
  )
}