import { useChatStore } from "@/features/agent/store/chat-store"
import { useAppStore } from "@/store"
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSubButton, SidebarMenuSubItem } from "../ui/sidebar"
import { BotMessageSquare } from "lucide-react"
import { useDeleteChat } from "@/features/agent/api/delete-chat"
import { trimText } from "@/lib/common"
import { UNTITLED_LABEL } from "@/features/board/const"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu"

/**
 * New chat item component
 */
export function NewChatItem() {
  const { view, setView } = useAppStore()
  const { currentChatId, setCurrentChatId } = useChatStore()

  const isActive = currentChatId === undefined && view === "chat"

  const handleClick = () => {
    setCurrentChatId(undefined)
    setView("chat")  // Switch to chat view when creating a new chat
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
export function ChatMenuItem({ chatId, label }: { chatId: string, label?: string }) {
  const { userId, view, setView } = useAppStore()
  const { currentChatId, setCurrentChatId } = useChatStore()
  const { deleteChat } = useDeleteChat()

  const handleClick = () => {
    setCurrentChatId(chatId)
    setView("chat")  // Switch to chat view when selecting a chat
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChat({ chatId, userId })
  }

  const chatLabel = trimText(label || UNTITLED_LABEL,100)

  const isActive = currentChatId === chatId && view === "chat"

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
        <ContextMenuContent>
          <ContextMenuItem onClick={() => handleDeleteChat(chatId)}>
            <span>Delete Chat</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuSubItem>
  )
}