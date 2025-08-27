import { useAppStore } from "@/store"
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSubButton, SidebarMenuSubItem } from "../ui/sidebar"
import { BotMessageSquare } from "lucide-react"
import { useDeleteChat } from "@/features/agent/api/delete-chat"
import { trimText } from "@/lib/common"
import { UNTITLED_LABEL } from "@/features/board/const"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

/**
 * New chat item component
 */
export function NewChatItem() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isActive = pathname === '/chats'

  const handleClick = () => {
    navigate({ to: '/chats' })
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className='text-xs text-primary font-medium truncate'
        isActive={isActive}
      >
        <BotMessageSquare className='text-xs shrink-0' strokeWidth={1.75} />
        <span>New Chat</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


/**
 * A chat item component
 */
export function ChatMenuItem({ chatId, label }: { chatId: string; label?: string }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isActive = pathname === `/chats/${chatId}`

  const { userId } = useAppStore()
  const { deleteChat } = useDeleteChat()

  const handleClick = () => {
    navigate({ to: '/chats/$id', params: { id: chatId } }) // 👈 SPA nav
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChat({ chatId, userId })
  }

  const chatLabel = trimText(label || UNTITLED_LABEL, 100)

  return (
    <SidebarMenuSubItem>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuSubButton
            onClick={handleClick}
            className='transition-all text-xs font-medium truncate cursor-pointer'
            isActive={isActive}
          >
            <span>{chatLabel}</span>
          </SidebarMenuSubButton>
        </ContextMenuTrigger>
        <ContextMenuContent className='w-44'>
          <ContextMenuItem onClick={() => handleDeleteChat(chatId)} variant='destructive'>
            <HugeiconsIcon
              icon={Delete02Icon}
              className="size-4 mr-2"
            />
            <span>Delete Chat</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuSubItem>
  )
}