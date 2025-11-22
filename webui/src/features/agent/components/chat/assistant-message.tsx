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

  const cities = useMemo(() => {
    if (!message.streaming && !isDeepResearch) {
      const cities = resp.steps.filter(step => step.name === 'display_weather_widget').map(
        step => (typeof step.output === 'object' && 'city' in step.output ? step.output.city : null)
      )
      return cities.filter((c): c is string => c !== null)
    }
    return []
  }, [message, isDeepResearch, resp.steps])

  const tradingSymbols = useMemo(() => {
    if (!message.streaming && !isDeepResearch) {
      const stockSymbols = resp.steps.filter(step => step.name === 'display_stock_widget').map(
        step => (typeof step.output === 'object' && 'symbol' in step.output ? step.output.symbol : null)
      )
      return stockSymbols.filter((s): s is string => s !== null)
    }
    return []
  }, [message, isDeepResearch, resp.steps])

  return (
    <div className='w-full'>
      <ReasoningStepsView
        response={resp}
        isStreaming={message.streaming || false}
        estimatedDurationSeconds={isDeepResearch ? 180 : undefined}
      />
      { cities.length > 0 && <WeatherCard cities={cities} /> }
      { tradingSymbols.length > 0 && <TradingCard symbols={tradingSymbols} initialRange="1d" /> }
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