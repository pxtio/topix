import React, { useState, type KeyboardEvent } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import clsx from 'clsx'
import { useChatStore } from '../../store/chat-store'
import { LlmDescription, LlmModels, LlmName, type LlmModel } from '../../types/llm'
import { useSendMessage } from '../../api/send-message'
import { generateUuid } from '@/lib/common'
import { useAppStore } from '@/store'
import { SendButton } from './send-button'
import TextareaAutosize from 'react-textarea-autosize'
import { Oc } from '@/components/oc'


/**
 * ModelCard is a component that displays the name and description of a LLM model
 * in a hover card format. It is used within the ModelChoiceMenu to provide
 * additional information about each model.
 */
const ModelCard: React.FC<{ model: LlmModel }> = ({ model }) => {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger className='text-mono'>{LlmName[model]}</HoverCardTrigger>
      <HoverCardContent className='w-48 rounded-xl border border-border bg-popover text-popover-foreground shadow' side="left" sideOffset={15}>
        <div className=''>
          {LlmDescription[model]}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}


/**
 * ModelChoiceMenu is a component that allows users to select an AI model
 * from a dropdown menu. It uses the Select component from the UI library
 * to create a styled dropdown with model options.
 */
const ModelChoiceMenu = () => {
  const setLlmModel = useChatStore((state) => state.setLlmModel)
  const llmModel = useChatStore((state) => state.llmModel)

  const handleModelChange = (model: LlmModel) => {
    setLlmModel(model)
  }

  return (
    <Select onValueChange={handleModelChange} defaultValue={llmModel}>
      <SelectTrigger className="h-8 w-auto rounded-full bg-card text-card-foreground border border-border text-xs px-3 shadow-md">
        <SelectValue defaultValue={llmModel} />
      </SelectTrigger>
      <SelectContent className='overflow-visible'>
        <SelectGroup>
          <SelectLabel>Models</SelectLabel>
          {
            LlmModels.map((model) => (
              <SelectItem key={model} value={model} className='text-xs'>
                <ModelCard model={model} />
              </SelectItem>
            ))
          }
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}


/**
 * Component that renders an input bar for sending messages in a chat interface.
 */
export const InputBar: React.FC = () => {
  const userId = useAppStore((state) => state.userId)

  const { currentChatId, llmModel, isStreaming } = useChatStore()

  const [input, setInput] = useState<string>("")

  const { sendMessage } = useSendMessage()

  const handleSearch = () => {
    // Implement your search logic here
    if (!input.trim()) {
      return
    }
    const payload = {
      query: input.trim(),
      messageId: generateUuid(),
      model: llmModel
    }
    sendMessage({ payload, userId })
    setInput("") // Clear the input after search
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const commandIconClass = clsx(
    'ml-auto',
    isStreaming
      ? 'cursor-not-allowed'
      : 'cursor-pointer'
  )

  const className = clsx(
    "transition-all absolute left-1/2 transform -translate-x-1/2 p-4 z-50 flex flex-col justify-center items-center gap-16",
    currentChatId ?
    "bottom-10"
    :
    "bottom-1/3"
  )

  return (
    <div className={className}>
      {
        !currentChatId && (
          <div className='w-full h-72 flex flex-col items-center justify-start'>
            <Oc className='fill-primary w-36'/>
            <div className='text-center text-xl text-card-foreground'>
              <span>Ask me anything — I’ll sniff out the answer!</span>
            </div>
          </div>
        )
      }
      <div className='flex flex-col space-y-2'>
        <div>
          <div
            className={`
              relative
              md:min-w-[800px]
              rounded-xl
              p-2
              bg-card
              text-card-foreground text-base
              border border-border
              shadow-lg
            `}
          >
            <div className='absolute -top-10 left-0 transform'>
              <ModelChoiceMenu />
            </div>
            <div className="relative flex flex-row items-center space-y-1 items-stretch">
              <div className='flex-1 p-2 flex items-center justify-center'>
                <TextareaAutosize
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                  minRows={1}
                  maxRows={10}
                  placeholder='Enter your message...'
                  className={`
                    w-full
                    h-full
                    resize-none border-none outline-none
                    bg-transparent
                    text-sm
                  `}
                />
              </div>
              <div className='flex items-center justify-center'>
                <SendButton
                  loadingStatus={isStreaming ? "loading": "loaded"}
                  disabled={isStreaming}
                  onClick={handleSearch}
                  className={commandIconClass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}