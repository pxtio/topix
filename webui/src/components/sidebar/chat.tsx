import { useAppStore } from "@/store"
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSubButton, SidebarMenuSubItem } from "../ui/sidebar"
import { BotMessageSquare } from "lucide-react"
import { useDeleteChat } from "@/features/agent/api/delete-chat"
import { trimText } from "@/lib/common"
import { UNTITLED_LABEL } from "@/features/board/const"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu"
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

/**
 * New chat item component
 */
export function NewChatItem({
  isSubMenuItem = false,
  initialBoardId = undefined
}: {
  isSubMenuItem?: boolean
  initialBoardId?: string
}) {
  const navigate = useNavigate()

  const queryParams = useSearch({ from: '/chats', select: (s: { board_id?: string }) => s, shouldThrow: false })
  const boardId = queryParams?.board_id
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isActive =
    pathname === '/chats' &&
    (initialBoardId ? boardId === initialBoardId : !boardId)

  const handleClick = () => {
    if (initialBoardId) {
      navigate({ to: '/chats', search: { board_id: initialBoardId } })
    } else {
      navigate({ to: '/chats' })
    }
  }
  if (isSubMenuItem) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          onClick={handleClick}
          className='text-xs text-muted-foreground font-medium truncate cursor-pointer'
          isActive={isActive}
        >
          <span>New Chat</span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className='text-xs text-secondary font-medium truncate cursor-pointer'
        isActive={isActive}
      >
        <BotMessageSquare className='text-xs shrink-0 text-sidebar-icon-4' strokeWidth={2} />
        <span>New Chat</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


/**
 * A chat item component
 */
export function ChatMenuItem({ chatId, label }: { chatId: string, label?: string }) {
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
    if (isActive) {
      navigate({ to: '/chats' })
    }
  }

  const fullChatLabel = label || UNTITLED_LABEL
  const chatLabel = trimText(fullChatLabel, 100)

  return (
    <SidebarMenuSubItem>
      <ContextMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuTrigger asChild>
              <SidebarMenuSubButton
                onClick={handleClick}
                className='transition-all text-xs font-medium truncate cursor-pointer'
                isActive={isActive}
              >
                <span>{chatLabel}</span>
              </SidebarMenuSubButton>
            </ContextMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="max-w-64">
            <p className="text-xs">{fullChatLabel}</p>
          </TooltipContent>
        </Tooltip>
        <ContextMenuContent className='w-44'>
          <ContextMenuItem
            onClick={() => handleDeleteChat(chatId)}
            variant='destructive'
            className='text-xs flex flex-row items-center'
          >
            <HugeiconsIcon
              icon={Delete02Icon}
              className="size-4 mr-2"
              strokeWidth={2}
            />
            <span>Delete Chat</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuSubItem>
  )
}
