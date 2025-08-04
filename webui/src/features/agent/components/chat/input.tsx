import React, { useState, type KeyboardEvent } from 'react'
import { Command, CommandInput, CommandList } from '../../../../components/ui/command'
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
      <SelectTrigger className="h-8 w-auto rounded-full bg-card text-card-foreground border border-border text-xs px-3 shadow-none">
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

  const llmModel = useChatStore((state) => state.llmModel)
  const isStreaming = useChatStore((state) => state.isStreaming)

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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && !input)) {
      e.preventDefault()
    } else if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const commandIconClass = clsx(
    'ml-auto',
    isStreaming
      ? 'cursor-not-allowed'
      : 'cursor-pointer'
  )

  return (
    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 p-4 z-50 flex justify-center items-center">
      <div className='flex flex-col space-y-2'>
        <div>
          <Command
            onKeyDown={handleKeyDown}
            className={`
              md:min-w-[800px]
              rounded-3xl
              p-3 pt-0
              bg-card
              text-card-foreground text-base
              border border-border
              shadow-sm
            `}
          >
            <div className="flex flex-col items-center space-y-1 items-stretch">
              <div className='p-2'>
                <CommandInput
                  placeholder='Enter your query ...'
                  value={input}
                  onValueChange={setInput}
                  className='border-b-none'
                />
              </div>
              <div className='flex justify-start'>
                <ModelChoiceMenu />
                <SendButton
                  loadingStatus={isStreaming ? "loading": "loaded"}
                  disabled={isStreaming}
                  onClick={handleSearch}
                  className={commandIconClass}
                />
              </div>

            </div>
            <CommandList>
            </CommandList>
          </Command>
        </div>
      </div>
    </div>
  )
}