import { MarkdownView } from "@/components/markdown/markdown-view"
import { ReasoningStepsView } from "./reasoning-steps"
import type { ChatMessage } from "../../types/chat"
import { ResponseActions } from "./actions/response-actions"
import clsx from "clsx"
import { SourcesView } from "./sources-view"
import { WeatherCard } from "@/features/widgets/components/weather-card"
import TradingCard from "@/features/widgets/components/trading-card"
import { useMemo } from "react"


/**
 * Component that renders the assistant's message in the chat.
 */
export const AssistantMessage = ({
  message,
}: {
  message: ChatMessage
}) => {
  const content = message.content
  const lastStep = message.properties?.reasoning?.reasoning.slice(-1)[0]
  const isSynthesis = lastStep?.name === 'synthesizer'
  const isDeepResearch = message.isDeepResearch || isSynthesis
  const resp = { steps: message.properties?.reasoning?.reasoning || [], isDeepResearch, sentAt: message.sentAt }

  const messageClass = clsx(
    "w-full p-4 space-y-2 min-w-0",
    isSynthesis && "rounded-xl border border-border/50 shadow-sm p-6",
    isSynthesis && !message.streaming && "overflow-y-auto scrollbar-thin max-h-[800px]"
  )

  const lastStepMessage = message.content ? (
    <div className={messageClass}>
      <MarkdownView content={content.markdown} />
    </div>
  ) : null

  const city = useMemo(() => {
    if (!message.streaming && !isDeepResearch) {
      const weatherStep = resp.steps.find(step => step.name === 'display_weather_widget')
      console.log('weatherStep', weatherStep)
      if (weatherStep && typeof weatherStep.output === 'object' && 'city' in weatherStep.output) {
        return weatherStep.output.city
      }
    }
    return undefined
  }, [message, isDeepResearch, resp.steps])

  const tradingSymbol = useMemo(() => {
    if (!message.streaming && !isDeepResearch) {
      const stockStep = resp.steps.find(step => step.name === 'display_stock_widget')
      if (stockStep && typeof stockStep.output === 'object' && 'symbol' in stockStep.output) {
        return stockStep.output.symbol
      }
    }
    return undefined
  }, [message, isDeepResearch, resp.steps])

  return (
    <div className='w-full space-y-4'>
      <ReasoningStepsView
        response={resp}
        isStreaming={message.streaming || false}
        estimatedDurationSeconds={isDeepResearch ? 180 : undefined}
      />
      { city && <WeatherCard city={city} /> }
      { tradingSymbol && <TradingCard symbol={tradingSymbol} initialRange="1d" /> }
      {lastStepMessage}
      {!message.streaming && resp && <SourcesView answer={resp} />}
      {!message.streaming && (
        <ResponseActions
          message={message.content.markdown}
          saveAsIs={isSynthesis}
        />
      )}
    </div>
  )
}