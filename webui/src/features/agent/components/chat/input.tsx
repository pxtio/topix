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
import { useNavigate, useRouterState, useParams } from '@tanstack/react-router'
import { ChatUrl } from '@/routes'
import { useDescribeChat } from '../../api/describe-chat'
import type { SendMessageRequestPayload } from '../../api/types'
import { WelcomeMessage } from './welcome-message'
import { InputSettings } from './input-settings/settings'

// shadcn/ui
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export interface InputBarProps {
  attachedBoardId?: string
  layout?: "floating" | "docked"
  preferChatRoute?: boolean
}

/**
 * Input bar with Deep Research confirmation using ONLY `input` state.
 * If `useDeepResearch` is enabled, pressing Enter/Send opens a dialog that:
 *  - Explains it will create a NEW chat
 *  - Lets the user edit the SAME input
 *  - Confirms to send & create a new chat
 */
export const InputBar = ({
  attachedBoardId,
  layout = "floating",
  preferChatRoute = false,
}: InputBarProps) => {
  const { chatId, setChatId } = useChat()

  const userId = useAppStore((state) => state.userId)

  const llmModel = useChatStore((state) => state.llmModel)
  const isStreaming = useChatStore((state) => state.isStreaming)
  const webSearchEngine = useChatStore((state) => state.webSearchEngine)
  const enabledTools = useChatStore((state) => state.enabledTools)
  const useDeepResearch = useChatStore((state) => state.useDeepResearch)
  const setUseDeepResearch = useChatStore((state) => state.setUseDeepResearch)

  const [input, setInput] = useState<string>('')

  // Deep Research dialog state
  const [showDRDialog, setShowDRDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { createChatAsync } = useCreateChat()
  const { updateChatAsync } = useUpdateChat()
  const { sendMessageAsync } = useSendMessage()
  const { describeChatAsync } = useDescribeChat()

  const navigate = useNavigate()
  const routerLocation = useRouterState({ select: (s) => s.location })
  const boardParams = useParams({ from: "/boards/$id", shouldThrow: false })
  const isBoardRoute = routerLocation.pathname?.startsWith("/boards/")
  const boardRouteId = boardParams?.id

  const proceedSend = async (text: string, forceNewChat = false) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const createNewChat = forceNewChat || !chatId
    let id: string

    const targetBoardId = attachedBoardId ?? boardRouteId

    if (createNewChat) {
      const newChatId = generateUuid()
      await createChatAsync({ userId, boardId: targetBoardId, chatId: newChatId })
      void updateChatAsync({ chatId: newChatId, chatData: { label: trimText(trimmed, 20) } }).catch(() => {})

      if (!preferChatRoute && isBoardRoute && targetBoardId) {
        navigate({
          to: "/boards/$id",
          params: { id: targetBoardId },
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            current_chat_id: newChatId
          })
        })
      } else {
        navigate({ to: ChatUrl, params: { id: newChatId } })
      }

      setChatId(newChatId)
      id = newChatId
    } else {
      id = chatId!
    }

    const payload: SendMessageRequestPayload = {
      query: trimmed,
      messageId: generateUuid(),
      model: llmModel,
      webSearchEngine,
      enabledTools,
      useDeepResearch,
    }

    // clear input right before launching search
    setInput('')
    // reset deep research toggle after sending
    setUseDeepResearch(false)

    await sendMessageAsync({ payload, userId, chatId: id })

    if (createNewChat) {
      void describeChatAsync({ chatId: id, userId }).catch(() => {})
    }
  }

  const handlePrimarySend = async () => {
    if (isStreaming) return
    if (useDeepResearch) {
      setShowDRDialog(true)
      return
    }
    await proceedSend(input, false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handlePrimarySend()
    }
  }

  const confirmDeepResearch = async () => {
    const trimmed = input.trim()
    if (!trimmed) return
    try {
      setIsSubmitting(true)
      setShowDRDialog(false)
      await proceedSend(trimmed, true /* force new chat */)
    } finally {
      setIsSubmitting(false)
    }
  }

  const commandIconClass = clsx(
    'ml-auto',
    isStreaming ? 'cursor-not-allowed' : 'cursor-pointer'
  )

  const isFloating = layout === "floating"

  const className = clsx(
    'transition-all flex flex-col items-center bg-transparent',
    isFloating
      ? clsx(
        'absolute inset-x-0 p-4 z-20 gap-12',
        chatId ? 'bottom-0' : 'bottom-1/2 transform translate-y-1/2'
      )
      : 'w-full mt-auto gap-4 px-4 pb-4'
  )

  const inboxClass = clsx(
    'rounded-2xl relative flex flex-row items-center space-y-1 items-stretch text-card-foreground text-base p-2',
    chatId ? 'bg-card backdrop-blur-lg supports-[backdrop-filter]:bg-card/70 dark:border dark:border-border/50 shadow-lg' :
      'bg-accent text-sm shadow-xl',
  )

  return (
    <div className={className}>
      {isFloating && !chatId && <WelcomeMessage />}

      <div className={clsx(
        "flex flex-col space-y-2 w-full items-center justify-center",
        isFloating ? '' : 'max-w-[900px] mx-auto'
      )}>
        <div className="relative w-full max-w-[800px] mx-auto">
          <div className="absolute -top-9 left-0 transform flex flex-row items-center gap-1">
            <InputSettings />
          </div>

          <div
            className={inboxClass}
          >
            <div className="flex-1 p-2 flex items-center justify-center">
              <TextareaAutosize
                onKeyDown={handleKeyDown}
                onChange={(e) => setInput(e.target.value)}
                value={input}
                minRows={2}
                maxRows={15}
                placeholder="Ask anything..."
                className="w-full h-full resize-none border-none outline-none bg-transparent text-sm"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-center">
              <SendButton
                loadingStatus={isStreaming ? 'loading' : 'loaded'}
                disabled={isStreaming}
                onClick={handlePrimarySend}
                className={commandIconClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Deep Research Confirmation Dialog (uses the SAME `input`) */}
      <Dialog open={showDRDialog} onOpenChange={setShowDRDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Start a Deep Research in a new chat?</DialogTitle>
            <DialogDescription>
              Deep Research runs longer, may use more tools, and will be created in a <strong>separate chat</strong>. Edit your prompt below before starting.
            </DialogDescription>
          </DialogHeader>

          <div className="grid w-full gap-2 py-2">
            <Label htmlFor="dr-prompt">Your prompt</Label>
            <TextareaAutosize
              id="dr-prompt"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              minRows={4}
              maxRows={18}
              className="w-full resize-none rounded-lg border border-border/50 shadow-sm bg-background px-3 py-2 text-sm outline-none"
              placeholder="Refine your prompt here..."
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="ghost" onClick={() => setShowDRDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={confirmDeepResearch} disabled={isSubmitting || !input.trim()}>
              {isSubmitting ? 'Starting…' : 'Start Deep Research'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
