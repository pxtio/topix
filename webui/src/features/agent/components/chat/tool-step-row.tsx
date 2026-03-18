import { useMemo, useState, type ReactNode } from "react"
import type { ToolCallStep } from "../../types/stream"
import { ToolNameIcon } from "../../types/stream"
import { extractStepDescription, getWebSearchUrls } from "../../utils/stream/build"
import type { CodeInterpreterOutput, CreateNoteOutput, EditNoteOutput } from "../../types/tool-outputs"
import type { ToolStepWidgetAttachment } from "./tool-step-widgets"
import { HugeiconsIcon } from "@hugeicons/react"
import { IdeaIcon, Search01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { MiniLinkCard } from "../link-preview"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { WeatherCard } from "@/features/widgets/components/weather-card"
import TradingCard from "@/features/widgets/components/trading-card"
import ImageSearchStrip from "@/features/widgets/components/image-card"
import { ImageGenView } from "./image-gen-view"


/**
 * Renders hidden thought details for a completed tool step.
 */
const ReasoningMessage = ({
  reasoning
}: { reasoning: string }) => {
  return (
    <div className='text-muted-foreground p-0 space-y-1 italic'>
      <div className='flex items-center gap-2 font-medium cursor-pointer text-sm'>
        <HugeiconsIcon icon={IdeaIcon} className='size-4' strokeWidth={2} />
        <span>Thought</span>
      </div>
      <span className='text-base'>{reasoning}</span>
    </div>
  )
}


/**
 * Renders code interpreter stdout and stderr when available.
 */
const CodeInterpreterResult = ({
  output
}: { output: CodeInterpreterOutput }) => {
  const stdout = output.stdout.trim()
  const stderr = output.stderr.trim()

  if (!stdout && !stderr) {
    return null
  }

  const blockClass = "w-full rounded-lg border p-3 font-mono text-sm leading-6 whitespace-pre-wrap break-words"

  return (
    <div className='w-full flex flex-col gap-2'>
      {stdout !== "" && (
        <div className='w-full flex flex-col gap-1'>
          <span className='text-sm font-medium text-muted-foreground'>stdout</span>
          <div className={cn(blockClass, "border-border bg-sidebar-accent/40 text-card-foreground")}>
            {stdout}
          </div>
        </div>
      )}
      {stderr !== "" && (
        <div className='w-full flex flex-col gap-1'>
          <span className='text-sm font-medium text-destructive'>stderr</span>
          <div className={cn(blockClass, "border-destructive/30 bg-destructive/5 text-destructive")}>
            {stderr}
          </div>
        </div>
      )}
    </div>
  )
}


/**
 * Renders a compact summary for note tool results.
 */
const NoteToolResult = ({
  output,
}: {
  output: CreateNoteOutput | EditNoteOutput
}) => {
  const typeLabel = output.noteType.replace(/-/g, " ")

  return (
    <div className='w-full rounded-lg border border-border bg-sidebar-accent/40 p-3'>
      <div className='text-sm font-medium text-muted-foreground'>note</div>
      <div className='mt-1 text-base text-card-foreground whitespace-pre-line'>
        <span className='font-medium'>{output.label || "Untitled note"}</span>
        {` • ${typeLabel}`}
      </div>
    </div>
  )
}


/**
 * Renders widget cards underneath the last step of each widget tool family.
 */
const ToolStepWidgetView = ({
  attachment,
}: {
  attachment?: ToolStepWidgetAttachment
}) => {
  if (!attachment) {
    return null
  }

  return (
    <div className='w-full flex flex-col gap-3 pt-1'>
      {attachment.imageFilename && <ImageGenView filename={attachment.imageFilename} />}
      {attachment.imageUrls && attachment.imageUrls.length > 0 && (
        <ImageSearchStrip images={attachment.imageUrls} />
      )}
      {attachment.weatherCities && attachment.weatherCities.length > 0 && (
        <WeatherCard cities={attachment.weatherCities} />
      )}
      {attachment.tradingSymbols && attachment.tradingSymbols.length > 0 && (
        <TradingCard symbols={attachment.tradingSymbols} initialRange='1d' />
      )}
    </div>
  )
}


/**
 * Renders one tool step row with optional details and widget attachments.
 */
export const ToolStepRow = ({
  step,
  isStreaming,
  attachment,
}: {
  step: ToolCallStep
  isStreaming?: boolean
  attachment?: ToolStepWidgetAttachment
}) => {
  const [viewMore, setViewMore] = useState(false)
  const [isInputCopied, setIsInputCopied] = useState(false)

  const { reasoning, message, title, input } = extractStepDescription(step)
  const codeInterpreterOutput = (
    step.name === "code_interpreter" &&
    typeof step.output !== "string"
  )
    ? step.output as CodeInterpreterOutput
    : null
  const noteToolOutput = (
    (step.name === "create_note" || step.name === "edit_note") &&
    typeof step.output !== "string"
  )
    ? step.output as CreateNoteOutput | EditNoteOutput
    : null

  const sources = useMemo(() => {
    if (!viewMore || isStreaming) return []
    return getWebSearchUrls(step)
  }, [viewMore, isStreaming, step])

  const handleInputCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setIsInputCopied(true)
    toast("Input copied to clipboard!")
    setTimeout(() => setIsInputCopied(false), 1500)
  }

  const isLoading = isStreaming || step.state === "started"
  const messageClass = "transition-all w-full h-auto min-h-2 p-2 rounded-xl"
  const spanMessageClass = "text-base text-card-foreground whitespace-pre-line"
  const stepIcon = ToolNameIcon[step.name]
  const successIcon = stepIcon || Tick01Icon
  const successDivClass = cn(
    "absolute rounded-full bg-primary z-20 flex items-center justify-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
    stepIcon ? "w-4 h-4 bg-transparent text-muted-foreground" : "w-3 h-3 bg-primary text-primary-foreground"
  )
  const iconClass = stepIcon ? "size-4" : "size-3"
  const canExpand = !isStreaming && (
    reasoning !== "" ||
    !!input ||
    !!codeInterpreterOutput ||
    !!noteToolOutput ||
    sources.length > 0
  )

  let inlineDetail: ReactNode = null

  if (canExpand && viewMore && reasoning !== "") {
    inlineDetail = <ReasoningMessage reasoning={reasoning} />
  }

  return (
    <div className='relative w-full p-2 flex flex-row items-start justify-start gap-2'>
      <div className='absolute w-[1px] h-full top-0 left-[0.98rem] bg-border' />
      <div className='relative flex-shrink-0'>
        <div className='relative z-20 mt-2 -ml-1 rounded-full bg-background w-6 h-6'>
          {isLoading && (
            <div className='absolute animate-ping w-3 h-3 rounded-full bg-primary/75 z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' />
          )}
          {!isLoading && (
            <div className={successDivClass}>
              <HugeiconsIcon icon={successIcon} className={iconClass} strokeWidth={2} />
            </div>
          )}
          {isLoading && (
            <div className='absolute w-2 h-2 rounded-full bg-primary z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' />
          )}
        </div>
      </div>
      <div className='relative flex-1 flex flex-col items-start rounded-lg text-sm'>
        <div className={messageClass}>
          <div className='flex flex-col gap-2'>
            <div>
              <h4 className='text-sm font-medium block h-6 leading-6'>{title}</h4>
              {canExpand && !viewMore && (
                <button
                  className='text-sm text-secondary font-sans hover:underline'
                  onClick={() => setViewMore(true)}
                >
                  Show details
                </button>
              )}
            </div>
            {message !== "" && (
              <span className={spanMessageClass}>
                {message}
              </span>
            )}
            {inlineDetail}
            {canExpand && viewMore && input && step.name !== "code_interpreter" && (
              <button
                className='text-sm font-mono px-2 py-1 rounded-sm bg-sidebar-accent/50 border border-border inline-flex flex-row items-center justify-start gap-1 max-w-[260px] sm:max-w-[320px] w-auto mr-auto overflow-hidden cursor-copy hover:bg-sidebar-accent/70 transition-colors'
                onClick={() => void handleInputCopy(input)}
                title={input}
              >
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className='size-3 shrink-0' />
                <span className='truncate min-w-0 text-left'>{input}</span>
                {isInputCopied && <span className='text-xs text-primary shrink-0'>copied</span>}
              </button>
            )}
            {canExpand && viewMore && input && step.name === "code_interpreter" && (
              <button
                className='w-full text-left rounded-lg border border-border bg-sidebar-accent/40 p-3 font-mono text-sm leading-6 whitespace-pre-wrap break-words hover:bg-sidebar-accent/60 transition-colors'
                onClick={() => void handleInputCopy(input)}
                title='Copy code'
              >
                {input}
              </button>
            )}
            {canExpand && viewMore && codeInterpreterOutput && (
              <CodeInterpreterResult output={codeInterpreterOutput} />
            )}
            {canExpand && viewMore && noteToolOutput && (
              <NoteToolResult output={noteToolOutput} />
            )}
            {canExpand && viewMore && sources.length > 0 && (
              <div className='w-full flex flex-row flex-wrap items-start gap-1 mt-2'>
                {sources.map((source, index) => <MiniLinkCard key={index} annotation={source} />)}
              </div>
            )}
            {canExpand && viewMore && (
              <button
                className='text-sm text-secondary font-sans hover:underline ml-2'
                onClick={() => setViewMore(false)}
              >
                Show less
              </button>
            )}
            {!isStreaming && <ToolStepWidgetView attachment={attachment} />}
          </div>
        </div>
      </div>
    </div>
  )
}
