import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { trimText } from "@/lib/common"
import { ToolNameDescription, type AgentResponse, type ReasoningStep } from "../../types/stream"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { extractStepDescription, getWebSearchUrls } from "../../utils/stream/build"
import { HugeiconsIcon } from "@hugeicons/react"
import { IdeaIcon } from "@hugeicons/core-free-icons"
import { ThinkingDots } from "@/components/progress-bar"


const ReasoningMessage = ({
  reasoning
}: { reasoning: string }) => {
  const [viewReasoning, setViewReasoning] = useState<boolean>(false)

  const handleClick = () => setViewReasoning(!viewReasoning)

  return (
    <div className='text-muted-foreground bg-background p-2 rounded-lg space-y-1'>
      <div className='flex items-center gap-2 font-medium text-foreground cursor-pointer' onClick={handleClick}>
        <HugeiconsIcon icon={IdeaIcon} className='size-4' strokeWidth={1.75} />
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
const ReasoningStepView = ({
  step,
  isLoading
}: { step: ReasoningStep, isLoading?: boolean }) => {
  const [viewMore, setViewMore] = useState<boolean>(false)

  const description = ToolNameDescription[step.name]
  const { reasoning, message } = extractStepDescription(step)

  const sources = getWebSearchUrls(step)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setViewMore(!viewMore)
  }

  const messageClass =
    viewMore ?
    'transition-all w-full h-auto min-h-2 p-2 rounded-xl bg-card text-card-foreground border border-border' :
    'transition-all w-full h-auto min-h-2 p-2 rounded-xl border border-transparent'

  return (
    <div
      className={`
        w-full
        p-2
        flex flex-row items-center justify-start gap-4
      `}
    >
      <div className='relative flex-shrink-0'>
        {
          isLoading &&
          <div className='absolute animate-ping w-2 h-2 rounded-full bg-primary/50 z-20' />
        }
        {
          isLoading ?
          <div className='relative w-2 h-2 rounded-full bg-primary/50 z-20' /> :
          <div className='relative w-2 h-2 rounded-full bg-primary z-20' />
        }
      </div>
      <div className='relative flex-1 flex flex-col items-start rounded-lg text-sm'>
        <div className={messageClass}>
          {
            viewMore ? (
              <div className='flex flex-col gap-2'>
                {
                  reasoning !== "" && <ReasoningMessage reasoning={reasoning} />
                }
                <span className='text-card-foreground whitespace-pre-line'>
                  {message}
                </span>
                <button
                  className='text-xs text-primary font-sans hover:underline ml-2'
                  onClick={handleClick}
                >
                  {"Show less"}
                </button>
              </div>
            ) : (
              <div>
                <span className='text-card-foreground whitespace-pre-line font-medium'>
                  {description}
                </span>
                <button
                  className='text-xs text-primary font-sans hover:underline ml-2'
                  onClick={handleClick}
                >
                  {"Show details"}
                </button>
              </div>
            )
          }
        </div>
        {
          sources && sources.length > 0 &&
          <div className='w-full flex flex-row flex-wrap items-start gap-1 p-1'>
            {
              sources.map((source, index) => (
                <HoverCard key={index}>
                  <HoverCardTrigger asChild>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className='transition-all inline-block px-2 py-1 text-muted-foreground text-xs font-medium border border-border bg-card hover:bg-accent rounded-lg'
                    >
                      {trimText(source.title || source.url, 20)}
                    </a>
                  </HoverCardTrigger>
                  <HoverCardContent asChild>
                    <ScrollArea>
                      <div className='w-full'>
                        <a className='text-sm text-muted-foreground' href={source.url}>{trimText(source.url, 50)}</a>
                      </div>
                    </ScrollArea>
                  </HoverCardContent>
                </HoverCard>
              ))
            }
          </div>
        }
      </div>
    </div>
  )
}


/**
 * ReasoningStepsViewProps defines the properties for the ReasoningStepsView component.
 * @property {boolean} isStreaming - Indicates if the response is being streamed.
 * @property {AgentResponse} response - The response from the agent containing reasoning steps.
 */
export interface ReasoningStepsViewProps {
  isStreaming: boolean
  response?: AgentResponse
}


/**
 * ReasoningStepsView component displays a list of reasoning steps from an agent response.
 * It allows toggling between showing the last step or all steps.
 * @param {ReasoningStepsViewProps} props - The properties for the component.
 */
export const ReasoningStepsView = ({ isStreaming, response }: ReasoningStepsViewProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true)

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
        p-4
        bg-background
        text-muted-foreground
        rounded-xl
        border border-border
      `}
    >
      <div className='font-medium text-base p-1 flex flex-row items-center justify-center'>
        <ThinkingDots message={"Thinking"} isStopped={!isStreaming} />
      </div>
      <div
        className={`
          flex flex-col items-start gap-2
          font-mono
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
        {
          isOpen &&
          <div
            className='absolute left-[0.73rem] top-0 w-[1px] h-full bg-border rounded-lg z-10'
          >
          </div>
        }
      </div>
      <button
        className='absolute bottom-0 right-1/2 transform translate-x-1/2'
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