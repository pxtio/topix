import { useState, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import { useChatStore } from '../../store/chat-store'
import { useSendMessage } from '../../api/send-message'
import { generateUuid, trimText } from '@/lib/common'
import { useAppStore } from '@/store'
import { SendButton } from './send-button'
import TextareaAutosize from 'react-textarea-autosize'
import { Oc } from '@/components/oc'
import { ModelChoiceMenu } from './input-settings/model-card'
import { SearchEngineChoiceMenu } from './input-settings/web-search'
import { useChat } from '../../hooks/chat-context'
import { useCreateChat } from '../../api/create-chat'
import { useUpdateChat } from '../../api/update-chat'
import { useNavigate } from '@tanstack/react-router'
import { ChatUrl } from '@/routes'
import { useDescribeChat } from '../../api/describe-chat'


export interface InputBarProps {
  attachedBoardId?: string
}


/**
 * Component that renders an input bar for sending messages in a chat interface.
 */
export const InputBar = ({ attachedBoardId }: InputBarProps) => {
  const { chatId, setChatId } = useChat()

  const userId = useAppStore((state) => state.userId)

  const { llmModel, isStreaming, webSearchEngine } = useChatStore()

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
    }

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
    "flex flex-col flex-1 self-end transform z-50 justify-center items-center gap-16 w-full",
    chatId ? "bottom-1/10": "bottom-1/3"
  )

  return (
    <div className={className}>
      {
        !chatId && (
          <div className='w-full h-72 flex flex-col items-center justify-start'>
            <Oc className='fill-primary w-36'/>
            <div className='text-center text-xl text-card-foreground'>
              <span>Ask me anything — I'll sniff out the answer!</span>
            </div>
          </div>
        )
      }
      <div className='w-full flex flex-col space-y-2'>
        <div>
          <div className='relative flex flex-col p-2 gap-2'>
            <div className='transform flex flex-row items-center gap-2'>
              <ModelChoiceMenu />
              <SearchEngineChoiceMenu />
            </div>
            <div className={`
              relative
              flex flex-row
              items-center items-stretch
              space-y-1
              bg-card text-card-foreground text-base
              rounded-xl border border-border shadow-lg
            `}>
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