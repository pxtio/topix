import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Chat } from '@/features/agent/components/chat-view'
import { LinkSquare01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { BotMessageSquare, ChevronRight } from 'lucide-react'

interface CopilotSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId?: string
  currentChatId?: string
  onOpenFullChat: (chatId?: string) => void
}

/**
 * Reusable board copilot sheet that can be mounted from any board surface.
 * It stays non-modal so users can keep interacting with the graph while open.
 */
export function CopilotSheet({
  open,
  onOpenChange,
  boardId,
  currentChatId,
  onOpenFullChat,
}: CopilotSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        showOverlay={false}
        showClose={false}
        // Keep the panel open when users click outside on the canvas.
        onInteractOutside={(event) => event.preventDefault()}
        className="w-[420px] max-w-[92vw] bg-sidebar text-sidebar-foreground border-l border-border p-0"
      >
        {/* Radix Dialog primitive requires an accessible title for content. */}
        <SheetHeader className="sr-only">
          <SheetTitle>Board Assistant</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 bg-sidebar">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BotMessageSquare className="size-4 text-sidebar-icon-4" strokeWidth={2} />
            Board Assistant
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenFullChat(currentChatId)}
              title="Open full chat view"
              aria-label="Open full chat view"
            >
              <HugeiconsIcon icon={LinkSquare01Icon} className="size-4" strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              title="Close"
              aria-label="Close"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 relative bg-sidebar overflow-y-auto scrollbar-thin">
          {/* Keep chat behavior unchanged: board-scoped thread when boardId is available. */}
          {boardId ? (
            <Chat
              initialBoardId={boardId}
              className="relative"
              showHistoricalChats
              chatId={currentChatId}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              Select a board to start a conversation.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
