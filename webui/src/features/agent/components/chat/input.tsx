import { useState, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import { useChatStore } from '../../store/chat-store'
import { useSendMessage } from '../../api/send-message'
import { generateUuid, trimText } from '@/lib/common'
import { useAppStore } from '@/store'
import { SendButton } from './send-button'
import TextareaAutosize from 'react-textarea-autosize'
import { useChat } from '../../hooks/chat-context'
import { useCreateChat } from '../../api/create-chat'
import { useUpdateChat } from '../../api/update-chat'
import { useNavigate } from '@tanstack/react-router'
import { ChatUrl } from '@/routes'
import { useDescribeChat } from '../../api/describe-chat'
import type { SendMessageRequestPayload } from '../../api/types'
import { WelcomeMessage } from './welcome-message'
import { InputSettings } from './input-settings/settings'


export interface InputBarProps {
  attachedBoardId?: string
}


/**
 * Component that renders an input bar for sending messages in a chat interface.
 */
export const InputBar = ({ attachedBoardId }: InputBarProps) => {
  const { chatId, setChatId } = useChat()

  const userId = useAppStore((state) => state.userId)

  const llmModel = useChatStore((state) => state.llmModel)
  const isStreaming = useChatStore((state) => state.isStreaming)
  const webSearchEngine = useChatStore((state) => state.webSearchEngine)
  const enabledTools = useChatStore((state) => state.enabledTools)

  const [input, setInput] = useState<string>("")

  const { createChatAsync } = useCreateChat()
  const { updateChatAsync } = useUpdateChat()
  const { sendMessageAsync } = useSendMessage()
  const { describeChatAsync } = useDescribeChat()

  const navigate = useNavigate()

  const handleSearch = async () => {
    // Implement your search logic here
    if (!input.trim()) {
      return
    }

    // create new chat if chatid is undefined
    let createNewChat: boolean = false
    let id: string
    if (!chatId) {
      createNewChat = true
      id = await createChatAsync({ userId, boardId: attachedBoardId })
      setChatId(id)
      navigate({ to: ChatUrl, params: { id } })
      await updateChatAsync({ chatId: id, userId, chatData: { label: trimText(input.trim(), 20) } })
    } else {
      id = chatId
    }

    const payload = {
      query: input.trim(),
      messageId: generateUuid(),
      model: llmModel,
      webSearchEngine,
      enabledTools,
    } as SendMessageRequestPayload

    // clear input right before launching search
    setInput("")
    await sendMessageAsync({ payload, userId, chatId: id })
    if (createNewChat) {
      await describeChatAsync({ chatId: id, userId })
    }
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
    "transition-all absolute inset-x-0 p-4 pt-10 z-50 flex flex-col justify-center items-center gap-16 bg-background/80 supports-[backdrop-filter]:bg-background/60 backdrop-blur-md",
    chatId ?
    "bottom-0"
    :
    "bottom-1/3"
  )

  return (
    <div className={className}>
      {
        !chatId && <WelcomeMessage />
      }
      <div className='flex flex-col space-y-2 w-full items-center justify-center'>
        <div
          className={`
            relative
            w-full max-w-[800px] mx-auto
            rounded-xl
            p-2
            bg-card
            text-card-foreground text-base
            border border-border
          `}
        >
          <div className='absolute -top-9 left-0 transform flex flex-row items-center gap-1'>
            <InputSettings />
          </div>
          <div className="relative flex flex-row items-center space-y-1 items-stretch">
            <div className='flex-1 p-2 flex items-center justify-center'>
              <TextareaAutosize
                onKeyDown={handleKeyDown}
                onChange={(e) => setInput(e.target.value)}
                value={input}
                minRows={2}
                maxRows={15}
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
  )
}