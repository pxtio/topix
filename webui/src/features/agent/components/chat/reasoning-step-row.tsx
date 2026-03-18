import { useState } from "react"
import type { ReasoningTextStep } from "../../types/stream"
import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ShinyText } from "@/components/animations/shiny-text"
import { MarkdownView } from "@/components/markdown/markdown-view"
import { cn } from "@/lib/utils"


/**
 * Renders one raw reasoning text step in the merged assistant timeline.
 */
export const ReasoningStepRow = ({
  step,
  isStreaming,
}: {
  step: ReasoningTextStep
  isStreaming?: boolean
}) => {
  const [viewMore, setViewMore] = useState(false)
  const hasReasoningDetails = !isStreaming && step.reasoning !== ""
  const isSynthesis = step.isSynthesis === true

  if (!isStreaming && step.message === "" && step.reasoning === "") {
    return null
  }

  const divClass = cn(
    "w-full py-1 px-2",
    isSynthesis && "rounded-xl md:p-4 p-2 shadow-sm border border-border/60 bg-card/70",
    !isStreaming && isSynthesis && "max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin"
  )

  return (
    <div
      className={divClass}
    >
      {isSynthesis && (
        <div className='pb-2 text-center text-sm font-medium text-muted-foreground font-mono'>
          Synthesis
        </div>
      )}
      {step.message !== "" ? (
        <div
          className="text-base text-card-foreground"
        >
          <MarkdownView content={step.message} isStreaming={isStreaming} />
        </div>
      ) : isStreaming ? (
        <ShinyText
          text='Thinking'
          disabled={false}
          speed={1}
          className='text-base text-foreground/50'
        />
      ) : null}
      {hasReasoningDetails && (
        <div className='mt-2'>
          <button
            className='inline-flex items-center gap-1 text-base font-semibold text-card-foreground'
            onClick={() => setViewMore((value) => !value)}
          >
            <span>Reasoning</span>
            <HugeiconsIcon
              icon={viewMore ? ArrowDown01Icon : ArrowRight01Icon}
              className='size-4'
              strokeWidth={2}
            />
          </button>
          {viewMore && (
            <div className='mt-2 text-base text-muted-foreground italic'>
              <MarkdownView content={step.reasoning} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
