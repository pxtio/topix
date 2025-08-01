import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { extractStepDescription } from "../../utils/stream"
import { trimText } from "@/lib/common"
import type { AgentResponse, ReasoningStep } from "../../types/stream"


/**
 * ThinkingDots component displays a "Thinking" message with animated dots.
 */
const ThinkingDots = () => {
  return (
    <div className="flex items-center space-x-1 text-base font-semibold p-4">
      <span>{"Thinking"}</span>
      <div className="inline-block flex space-x-1">
        <span className="animate-bounce [animation-delay:0s]">.</span>
        <span className="animate-bounce [animation-delay:0.2s]">.</span>
        <span className="animate-bounce [animation-delay:0.4s]">.</span>
      </div>
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
  const message = extractStepDescription(step)

  const trimmedMessage = trimText(message.trim().replace(/\n{2,}/g, '\n'), 200)
  const longerTrimmedMessage = trimText(message.trim().replace(/\n{2,}/g, '\n'), 800)

  const [viewMore, setViewMore] = useState<boolean>(false)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setViewMore(!viewMore)
  }

  const messageClass =
    viewMore ?
    'transition-all h-auto min-h-2 p-2 rounded-xl bg-white border border-stone-300' :
    'transition-all h-auto min-h-2 p-2 rounded-xl border border-transparent'

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
          <div className='absolute animate-ping w-2 h-2 rounded-full bg-stone-500 z-20' />
        }
        {
          isLoading ?
          <div className='relative w-2 h-2 rounded-full bg-stone-700 z-20' /> :
          <div className='relative w-2 h-2 rounded-full bg-teal-700 z-20' />
        }
      </div>
      <div className={messageClass}>
        {
          viewMore &&
          <span className='text-xs text-stone-600 whitespace-pre-line'>
            {longerTrimmedMessage}
          </span>
        }
        {
          !viewMore &&
          <span className='text-xs text-stone-600 whitespace-pre-line'>
            {trimmedMessage}
          </span>
        }
        {
          message.length > 200 &&
          <button
            className='text-xs text-blue-500 hover:underline ml-2'
            onClick={handleClick}
          >
            {viewMore ? "Show less" : "Show more"}
          </button>
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
  response?: AgentResponse
}


/**
 * ReasoningStepsView component displays a list of reasoning steps from an agent response.
 * It allows toggling between showing the last step or all steps.
 * @param {ReasoningStepsViewProps} props - The properties for the component.
 */
export const ReasoningStepsView = ({ response }: ReasoningStepsViewProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true)

  if (!response || response.steps.length === 0) {
    return (
      <div className='w-full p-4 text-left'>
        <ThinkingDots />
      </div>
    )
  }

  return (
    <div
      className={`
        relative
        w-full
        p-4
        bg-stone-100
        rounded-xl
        border border-stone-200
      `}
    >
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
            className='absolute left-[0.73rem] top-0 w-[1px] h-full bg-stone-300 rounded-lg z-10'
          >
          </div>
        }
      </div>
      <button
        className='absolute bottom-0 right-1/2 transform translate-x-1/2'
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className='transition-all text-xs text-stone-400 hover:text-stone-600'>
          {isOpen ? <ChevronUp className='w-4 h-4 flex-shrink-0' /> : <ChevronDown className='w-4 h-4 flex-shrink-0' />}
        </span>
      </button>
    </div>
  )
}