import { memo, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { ToolNameIcon, type AgentResponse, type ReasoningStep } from "../../types/stream"
import { extractStepDescription, getWebSearchUrls } from "../../utils/stream/build"
import { HugeiconsIcon } from "@hugeicons/react"
import { IdeaIcon, Tick01Icon } from "@hugeicons/core-free-icons"
import { ThinkingDots } from "@/components/loading-view"
import { MiniLinkCard } from "../link-preview"
import { cn } from "@/lib/utils"
import { ProgressBar } from "@/components/progress-bar"


const ReasoningMessage = ({
  reasoning
}: { reasoning: string }) => {
  const [viewReasoning, setViewReasoning] = useState<boolean>(false)

  const handleClick = () => setViewReasoning(!viewReasoning)

  return (
    <div className='text-muted-foreground bg-background p-2 rounded-lg space-y-1'>
      <div className='flex items-center gap-2 font-medium text-foreground cursor-pointer' onClick={handleClick}>
        <HugeiconsIcon icon={IdeaIcon} className='size-4' strokeWidth={2} />
        <span>Reasoning</span>
      </div>
      {viewReasoning && <span>{reasoning}</span>}
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

  const { reasoning, message, title } = extractStepDescription(step)

  const sources = viewMore ? getWebSearchUrls(step) : []

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setViewMore(!viewMore)
  }

  const messageClass = cn(
    'transition-all w-full h-auto min-h-2 p-2 rounded-xl',
    viewMore ? 'bg-card' : ''
  )

  const spanMessageClass = cn(
    'text-card-foreground whitespace-pre-line',
    message.length > 50 ? 'font-normal' : 'font-medium'
  )

  const stepIcon = ToolNameIcon[step.name]
  const successIcon = stepIcon || Tick01Icon
  const successDivClass = cn(
    'absolute rounded-full bg-secondary z-20 flex items-center justify-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
    stepIcon ? 'w-3 h-3 bg-transparent text-secondary' : 'w-2.5 h-2.5 bg-secondary text-secondary-foreground'
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
        <div className="relative z-20 mt-0.5 rounded-full bg-card w-4 h-4">
          {
            isLoading &&
            <div className='absolute animate-ping w-2 h-2 rounded-full bg-secondary/75 z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' />
          }
          {
            isLoading ?
            <div className='absolute w-2 h-2 rounded-full bg-secondary z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' /> :
            <div className={successDivClass}>
              <HugeiconsIcon icon={successIcon} className={iconClass} strokeWidth={2} />
            </div>
          }
        </div>
      </div>
      <div className='relative flex-1 flex flex-col items-start rounded-lg text-xs'>
        <div className={messageClass}>
           <div className='flex flex-col gap-1'>
            <div>
              <h4 className='text-xs font-medium inline'>{title}</h4>
              {
                !viewMore && (
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
            { viewMore && message !== "" && <span className={spanMessageClass}>{message}</span>}
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


export const ReasoningStepView = memo(ReasoningStepViewImpl, (prev, next) => {
  const a = prev.step
  const b = next.step
  if (prev.isLoading !== next.isLoading) return false
  // compare the fields that actually affect rendering
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.state === b.state &&
    a.thought === b.thought &&
    a.output === b.output &&
    (a.eventMessages?.length || 0) === (b.eventMessages?.length || 0)
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

  if (!response || response.steps.length === 0) {
    return (
      <div className='w-full p-4 text-left'>
        <ThinkingDots message={"Thinking"} />
      </div>
    )
  }

  return (
    <div
      className={`
        relative
        w-full
        p-3
        bg-card
        text-muted-foreground
        rounded-xl
        shadow-md
      `}
    >
      <div className='font-medium text-base p-1 flex flex-row items-center justify-center'>
        <ThinkingDots message={"Thinking"} isStopped={!isStreaming} />
      </div>
      {
        estimatedDurationSeconds && (
          <ProgressBar estimatedTime={estimatedDurationSeconds} isStop={!isStreaming} />
        )
      }
      <div
        className={`
          flex flex-col items-start
          font-sans
          text-sm
          relative
        `}
      >
        {
          !isOpen &&
          <ReasoningStepView
            step={response.steps[response.steps.length - 1]}
            isLoading={response.steps[response.steps.length - 1].state === "started"}
          />
        }
        {
          isOpen &&
          response.steps.map((step, index) => <ReasoningStepView
            key={index}
            step={step}
            isLoading={step.state === "started"}
          />)
        }
        <div
          className='absolute left-[0.975rem] top-0 w-[1px] h-full bg-secondary rounded-lg z-10'
        />
      </div>
      <button
        className='absolute bottom-1 right-1/2 transform translate-x-1/2'
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className='transition-all text-xs text-accent-foreground hover:text-card-foreground'>
          {
            isOpen ?
            <ChevronUp className='w-4 h-4 flex-shrink-0' /> :
            <ChevronDown className='w-4 h-4 flex-shrink-0' />
          }
        </span>
      </button>
    </div>
  )
}