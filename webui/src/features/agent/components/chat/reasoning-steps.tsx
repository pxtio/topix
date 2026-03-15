import { memo, useMemo, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { ToolNameIcon, type AgentResponse, type ReasoningStep } from "../../types/stream"
import { extractStepDescription, getWebSearchUrls } from "../../utils/stream/build"
import type { CodeInterpreterOutput, CreateNoteOutput, EditNoteOutput } from "../../types/tool-outputs"
import { HugeiconsIcon } from "@hugeicons/react"
import { IdeaIcon, Search01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { ThinkingDots } from "@/components/loading-view"
import { MiniLinkCard } from "../link-preview"
import { cn } from "@/lib/utils"
import { ProgressBar } from "@/components/progress-bar"
import { toast } from "sonner"


const ReasoningMessage = ({
  reasoning
}: { reasoning: string }) => {
  return (
    <div className='text-muted-foreground p-0 space-y-1 italic'>
      <div className='flex items-center gap-2 font-medium cursor-pointer'>
        <HugeiconsIcon icon={IdeaIcon} className='size-4' strokeWidth={2} />
        <span>Thought</span>
      </div>
      <span>{reasoning}</span>
    </div>
  )
}


const CodeInterpreterResult = ({
  output
}: { output: CodeInterpreterOutput }) => {
  const stdout = output.stdout.trim()
  const stderr = output.stderr.trim()

  if (!stdout && !stderr) {
    return null
  }

  const blockClass = "w-full rounded-lg border p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap break-words"

  return (
    <div className='w-full flex flex-col gap-2'>
      {
        stdout !== "" && (
          <div className='w-full flex flex-col gap-1'>
            <span className='text-[11px] font-medium text-muted-foreground'>stdout</span>
            <div className={cn(blockClass, "border-border bg-sidebar-accent/40 text-card-foreground")}>
              {stdout}
            </div>
          </div>
        )
      }
      {
        stderr !== "" && (
          <div className='w-full flex flex-col gap-1'>
            <span className='text-[11px] font-medium text-destructive'>stderr</span>
            <div className={cn(blockClass, "border-destructive/30 bg-destructive/5 text-destructive")}>
              {stderr}
            </div>
          </div>
        )
      }
    </div>
  )
}


const NoteToolResult = ({
  output,
}: {
  output: CreateNoteOutput | EditNoteOutput
}) => {
  const typeLabel = output.noteType.replace(/-/g, " ")

  return (
    <div className='w-full rounded-lg border border-border bg-sidebar-accent/40 p-3'>
      <div className='text-[11px] font-medium text-muted-foreground'>note</div>
      <div className='mt-1 text-xs text-card-foreground whitespace-pre-line'>
        <span className='font-medium'>{output.label || "Untitled note"}</span>
        {` • ${typeLabel}`}
      </div>
    </div>
  )
}


/**
 * ReasoningStepView component displays a single reasoning step.
 * @param {ReasoningStep} step - The reasoning step to display.
 */
const ReasoningStepViewImpl = ({
  step,
  isLoading
}: { step: ReasoningStep, isLoading?: boolean }) => {
  const [viewMore, setViewMore] = useState<boolean>(false)
  const [isInputCopied, setIsInputCopied] = useState<boolean>(false)

  const { reasoning, message, title, input } = extractStepDescription(step)
  const codeInterpreterOutput = step.name === "code_interpreter" && typeof step.output !== "string"
    ? step.output as CodeInterpreterOutput
    : null
  const noteToolOutput = (
    (step.name === "create_note" || step.name === "edit_note") &&
    typeof step.output !== "string"
  )
    ? step.output as CreateNoteOutput | EditNoteOutput
    : null

  const sources = useMemo(() => {
    if (!viewMore) return []
    return getWebSearchUrls(step)
  }, [viewMore, step])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setViewMore(!viewMore)
  }

  const handleInputCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setIsInputCopied(true)
    toast("Input copied to clipboard!")
    setTimeout(() => setIsInputCopied(false), 1500)
  }

  const messageClass = 'transition-all w-full h-auto min-h-2 p-2 rounded-xl'

  const spanMessageClass = 'text-card-foreground whitespace-pre-line'

  const stepIcon = ToolNameIcon[step.name]
  const successIcon = stepIcon || Tick01Icon
  const successDivClass = cn(
    'absolute rounded-full bg-primary z-20 flex items-center justify-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
    stepIcon ? 'w-3 h-3 bg-transparent text-muted-foreground' : 'w-2.5 h-2.5 bg-primary text-primary-foreground'
  )
  const iconClass = stepIcon ? "size-3" : "size-2"

  return (
    <div
      className={`
        w-full
        p-2
        flex flex-row items-center justify-start gap-2
      `}
    >
      <div className='relative flex-shrink-0'>
        <div className="relative z-20 mt-[2px] -ml-1 rounded-full bg-sidebar w-6 h-6">
          {
            isLoading &&
            <div className='absolute animate-ping w-2 h-2 rounded-full bg-primary/75 z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' />
          }
          {
            isLoading ?
            <div className='absolute w-2 h-2 rounded-full bg-primary z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' /> :
            <div className={successDivClass}>
              <HugeiconsIcon icon={successIcon} className={iconClass} strokeWidth={2} />
            </div>
          }
        </div>
      </div>
      <div className='relative flex-1 flex flex-col items-start rounded-lg text-xs'>
        <div className={messageClass}>
          <div className='flex flex-col gap-2'>
            <div>
              <h4 className='text-xs font-medium inline'>{title}</h4>
              {
                !viewMore && !isLoading && (
                  <button
                    className='text-xs text-secondary font-sans hover:underline ml-2'
                    onClick={handleClick}
                  >
                    {"Show details"}
                  </button>
                )
              }
            </div>
            {
              viewMore && reasoning !== "" && <ReasoningMessage reasoning={reasoning} />
            }
            {
              viewMore && input && step.name !== "code_interpreter" && (
                <button
                  className='text-xs font-mono px-2 py-1 rounded-sm bg-sidebar-accent/50 border border-border inline-flex flex-row items-center justify-start gap-1 max-w-[240px] sm:max-w-[270px] w-auto mr-auto overflow-hidden cursor-copy hover:bg-sidebar-accent/70 transition-colors'
                  onClick={() => void handleInputCopy(input)}
                  title={input}
                >
                  <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className='size-3 shrink-0' />
                  <span className='truncate min-w-0 text-left'>{input}</span>
                  {
                    isInputCopied && <span className='text-[10px] text-primary shrink-0'>copied</span>
                  }
                </button>
              )
            }
            {
              viewMore && input && step.name === "code_interpreter" && (
                <button
                  className='w-full text-left rounded-lg border border-border bg-sidebar-accent/40 p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap break-words hover:bg-sidebar-accent/60 transition-colors'
                  onClick={() => void handleInputCopy(input)}
                  title='Copy code'
                >
                  {input}
                </button>
              )
            }
            {
              viewMore && message !== "" && (
                <span className={spanMessageClass}>
                  {message}
                </span>
              )
            }
            {
              viewMore && codeInterpreterOutput && (
                <CodeInterpreterResult output={codeInterpreterOutput} />
              )
            }
            {
              viewMore && noteToolOutput && (
                <NoteToolResult
                  output={noteToolOutput}
                />
              )
            }
            {
              viewMore && sources && sources.length > 0 &&
              <div className='w-full flex flex-row flex-wrap items-start gap-1 mt-2'>
                {
                  sources.map((source, index) => <MiniLinkCard key={index} annotation={source} />)
                }
              </div>
            }
            {
              viewMore && <button
                className='text-xs text-secondary font-sans hover:underline ml-2'
                onClick={handleClick}
              >
                {"Show less"}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}


const eventMessagesEqual = (a?: string[], b?: string[]) => {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  const last = a.length - 1
  return last < 0 || a[last] === b[last]
}

export const ReasoningStepView = memo(ReasoningStepViewImpl, (prev, next) => {
  const a = prev.step
  const b = next.step
  if (prev.isLoading !== next.isLoading) return false
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.state === b.state &&
    a.thought === b.thought &&
    a.output === b.output &&
    eventMessagesEqual(a.eventMessages, b.eventMessages)
  )
})


/**
 * ReasoningStepsViewProps defines the properties for the ReasoningStepsView component.
 * @property {boolean} isStreaming - Indicates if the response is being streamed.
 * @property {AgentResponse} response - The response from the agent containing reasoning steps.
 */
export interface ReasoningStepsViewProps {
  isStreaming: boolean
  response?: AgentResponse
  estimatedDurationSeconds?: number
}


/**
 * ReasoningStepsView component displays a list of reasoning steps from an agent response.
 * It allows toggling between showing the last step or all steps.
 * @param {ReasoningStepsViewProps} props - The properties for the component.
 */
export const ReasoningStepsView = ({ isStreaming, response, estimatedDurationSeconds }: ReasoningStepsViewProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const lastStepMessage = useMemo(() => {
    if (!response || response.steps.length === 0) return "Thinking"
    const lastStep = response.steps[response.steps.length - 1]
    const { title } = extractStepDescription(lastStep)
    return title
  }, [response])

  const titleMessage = isStreaming ? lastStepMessage : "Steps"

  if (!response) {
    return null
  }

  return (
    <>
      {
        (!isOpen || isStreaming) ? (
          <div className='w-full flex flex-col items-center gap-2'>
            <div className='w-full p-4 text-left flex flex-row items-center gap-2'>
              <ThinkingDots message={titleMessage} isStopped={!isStreaming} />
              {
                !isStreaming && (
                  <span
                    className='transition-all text-xs text-accent-foreground hover:text-card-foreground'
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <ChevronDown className='w-4 h-4 flex-shrink-0' />
                  </span>
                )
              }
            </div>
            {
              estimatedDurationSeconds && isStreaming && (
                <div className='w-full flex flex-col items-start'>
                  <div className='w-full max-w-[300px] border border-border shadow-sm rounded-lg bg-background px-2 py-4'>
                    <ProgressBar estimatedTime={estimatedDurationSeconds} isStop={!isStreaming} startedAt={response.sentAt} />
                  </div>
                </div>
              )
            }
          </div>
        ): (
          <div
            className={`
              relative
              w-full
              p-3
              bg-sidebar
              text-muted-foreground
              rounded-xl
              border-border/30
              border
            `}
          >
            <div className='font-medium text-base p-1 flex flex-row items-center justify-center gap-2'>
              <ThinkingDots message={titleMessage} isStopped={!isStreaming} />
              <span
                className='transition-all text-xs text-accent-foreground hover:text-card-foreground'
                onClick={() => setIsOpen(!isOpen)}
              >
                <ChevronUp className='w-4 h-4 flex-shrink-0' />
              </span>
            </div>

            <div
              className={`
                flex flex-col items-start
                font-sans
                text-sm
                relative
              `}
            >
              {
                isOpen &&
                response.steps.map((step) => <ReasoningStepView
                  key={step.id}
                  step={step}
                  isLoading={step.state === "started"}
                />)
              }
              <div
                className='absolute left-[0.975rem] top-0 w-[1px] h-full bg-border rounded-lg z-10'
              />
            </div>
          </div>
        )
      }
    </>
  )
}
