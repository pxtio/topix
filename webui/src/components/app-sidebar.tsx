import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useDeleteChat } from "@/features/agent/api/delete-chat"
import { useListChats } from "@/features/agent/api/list-chats"
import { useAppStore } from "@/store"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { BotMessageSquare, History, MoreHorizontal, PaintRoller, Palette } from "lucide-react"
import { useChatStore } from "@/features/agent/store/chat-store"
import { trimText } from "@/lib/common"
import { useBoardStore } from "@/features/board/store/board-store"
import { useListBoards } from "@/features/board/api/list-boards"
import { useCreateBoard } from "@/features/board/api/create-board"
import { useDeleteBoard } from "@/features/board/api/delete-board"


function NewBoardItem() {
  const userId = useAppStore((state) => state.userId)

  const { createBoard } = useCreateBoard()

  const itemClass = 'text-xs font-medium transition-all rounded-lg hover:bg-stone-200'

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={itemClass}
        onClick={() => createBoard({ userId })}
      >
        <PaintRoller className='text-xs shrink-0' strokeWidth={1.75} />
        <span>New Board</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


function BoardItem({ boardId, label }: { boardId: string, label?: string }) {
  const userId = useAppStore((state) => state.userId)
  const setCurrentBoardId = useBoardStore((state) => state.setCurrentBoardId)
  const currentBoardId = useBoardStore((state) => state.currentBoardId)

  const { deleteBoard } = useDeleteBoard()

  const itemClass = 'text-xs font-medium transition-all rounded-lg hover:bg-stone-200' + (currentBoardId === boardId ? ' bg-stone-200/70' : '')

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={() => setCurrentBoardId(boardId)} className={itemClass} >
        <Palette className='shrink-0' strokeWidth={1.75} />
        <span>{trimText(label || "Untitled Board", 20)}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction className='text-xs'>
            <MoreHorizontal className='text-xs' strokeWidth={1.75} />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => deleteBoard({ boardId, userId })}>
            <span>Delete Board</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}


function NewChatItem() {
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId)

  const currentChatId = useChatStore((state) => state.currentChatId)

  const itemClass = 'text-xs font-medium transition-all rounded-lg hover:bg-stone-200' + (currentChatId === undefined ? ' bg-stone-200/70' : '')

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={itemClass}
        onClick={() => setCurrentChatId(undefined)}
      >
        <BotMessageSquare className='text-xs shrink-0' strokeWidth={1.75} />
        <span>New Chat</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


function ChatMenuItem({ chatId, label }: { chatId: string, label?: string }) {
  const { deleteChat } = useDeleteChat()

  const userId = useAppStore((state) => state.userId)

  const currentChatId = useChatStore((state) => state.currentChatId)
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId)

  const handleDeleteChat = (chatId: string) => {
    deleteChat({ chatId, userId })
  }

  const chatLabel = trimText(label || "Untitled Chat", 20)

  const itemClass = 'text-xs font-medium transition-all rounded-lg hover:bg-stone-200' + (currentChatId === chatId ? ' bg-stone-200/70' : '')

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild className={itemClass} onClick={() => setCurrentChatId(chatId)}>
        <span>{chatLabel}</span>
      </SidebarMenuSubButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction className='text-xs'>
            <MoreHorizontal className='text-xs' strokeWidth={1.75} />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => handleDeleteChat(chatId)}>
            <span>Delete Chat</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuSubItem>
  )
}


export function AppSidebar() {
  const userId = useAppStore((state) => state.userId)

  const { data: chats } = useListChats({ userId })

  const { data: boards } = useListBoards({ userId })

  const chatItems = chats?.map((chat) => <ChatMenuItem key={chat.uid} chatId={chat.uid} label={chat.label} />) || []
  const boardItems = boards?.map((board) => <BoardItem key={board.id} boardId={board.id} label={board.label} />) || []

  return (
    <Sidebar variant='floating' collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Workspace</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NewBoardItem />
              {boardItems}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Chats</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NewChatItem />
              <SidebarMenuItem>
                <SidebarMenuButton className='font-medium text-xs'>
                  <History className='shrink-0' strokeWidth={1.75}/>
                  <span>Chat History</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {chatItems}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}