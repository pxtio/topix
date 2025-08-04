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
import { BotMessageSquare, History, Minus, MoreHorizontal, PaintRoller, Palette, Plus } from "lucide-react"
import { useChatStore } from "@/features/agent/store/chat-store"
import { trimText } from "@/lib/common"
import { useBoardStore } from "@/features/board/store/board-store"
import { useListBoards } from "@/features/board/api/list-boards"
import { useCreateBoard } from "@/features/board/api/create-board"
import { useDeleteBoard } from "@/features/board/api/delete-board"
import { Collapsible, CollapsibleTrigger } from "./ui/collapsible"
import { CollapsibleContent } from "@radix-ui/react-collapsible"


function NewBoardItem() {
  const setView = useAppStore((state) => state.setView)
  const userId = useAppStore((state) => state.userId)

  const { createBoard } = useCreateBoard()

  const handleClick = () => {
    createBoard({ userId })
    setView("board")  // Switch to board view when creating a new board
  }

  const itemClass = 'text-xs font-medium transition-all rounded-lg hover:bg-sidebar-accent'

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={itemClass}
        onClick={handleClick}
      >
        <PaintRoller className='text-xs shrink-0' strokeWidth={1.75} />
        <span>New Board</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


function BoardItem({ boardId, label }: { boardId: string, label?: string }) {
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)
  const userId = useAppStore((state) => state.userId)
  const setCurrentBoardId = useBoardStore((state) => state.setCurrentBoardId)
  const currentBoardId = useBoardStore((state) => state.currentBoardId)

  const { deleteBoard } = useDeleteBoard()

  const handleClick = () => {
    setCurrentBoardId(boardId)
    setView("board")  // Switch to board view when selecting a board
  }

  const itemClass = 'text-xs font-medium transition-all rounded-lg hover:bg-sidebar-accent' + (currentBoardId === boardId && view === "board" ? ' bg-sidebar-accent/70' : '')

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={handleClick} className={itemClass} >
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
  const view = useAppStore((state) => state.view)
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId)
  const setView = useAppStore((state) => state.setView)

  const currentChatId = useChatStore((state) => state.currentChatId)

  const itemClass = 'text-xs font-medium transition-all rounded-lg hover:bg-sidebar-accent' + (currentChatId === undefined && view === "chat" ? ' bg-sidebar-accent/70' : '')

  const handleClick = () => {
    setCurrentChatId(undefined)
    setView("chat")  // Switch to chat view when creating a new chat
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={itemClass}
        onClick={handleClick}
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
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)

  const currentChatId = useChatStore((state) => state.currentChatId)
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId)

  const handleClick = () => {
    setCurrentChatId(chatId)
    setView("chat")  // Switch to chat view when selecting a chat
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChat({ chatId, userId })
  }

  const chatLabel = trimText(label || "Untitled Chat", 20)

  const itemClass = 'text-xs font-medium transition-all rounded-lg hover:bg-sidebar-accent' + (currentChatId === chatId && view === "chat" ? ' bg-sidebar-accent/70' : '')

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild className={itemClass} onClick={handleClick}>
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
              <Collapsible
                defaultOpen={true}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuSubButton className='font-medium text-xs flex flex-row items-center w-full'>
                      <History className='shrink-0' strokeWidth={1.75} />
                      <span>Chat History</span>
                      <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" strokeWidth={1.75} />
                      <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" strokeWidth={1.75} />
                    </SidebarMenuSubButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {chatItems}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}