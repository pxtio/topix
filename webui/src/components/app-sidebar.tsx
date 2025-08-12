import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import { useDeleteChat } from "@/features/agent/api/delete-chat"
import { useListChats } from "@/features/agent/api/list-chats"
import { useAppStore } from "@/store"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { BotMessageSquare, History, Minus, MoreHorizontal, PenLine, Plus, Share2 } from "lucide-react"
import { useChatStore } from "@/features/agent/store/chat-store"
import { trimText } from "@/lib/common"
import { useListBoards } from "@/features/board/api/list-boards"
import { useCreateBoard } from "@/features/board/api/create-board"
import { useDeleteBoard } from "@/features/board/api/delete-board"
import { Collapsible, CollapsibleTrigger } from "./ui/collapsible"
import { CollapsibleContent } from "@radix-ui/react-collapsible"
import { useGraphStore } from "@/features/board/store/graph-store"
import { useGetBoard } from "@/features/board/api/get-board"
import { UNTITLED_LABEL } from "@/features/board/const"
import { ScrollArea } from "./ui/scroll-area"


/**
 * New board item component
 */
function NewBoardItem() {
  const setView = useAppStore((state) => state.setView)
  const userId = useAppStore((state) => state.userId)

  const { createBoard } = useCreateBoard()

  const handleClick = () => {
    createBoard({ userId })
    setView("board")  // Switch to board view when creating a new board
  }

  const itemClass = 'text-primary text-xs font-medium transition-all'

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={itemClass}
        onClick={handleClick}
      >
        <PenLine className='text-xs shrink-0' strokeWidth={1.75} />
        <span>New Board</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


/**
 * A board item component
 */
function BoardItem({ boardId, label }: { boardId: string, label?: string }) {
  const { view, setView, userId } = useAppStore()
  const { boardId: currentBoardId, setBoardId, setNodes, setEdges, setIsLoading } = useGraphStore()

  const { deleteBoard } = useDeleteBoard()

  const { getBoard } = useGetBoard()

  const handleClick = () => {
    setBoardId(boardId)
    setIsLoading(true)
    setNodes([])
    setEdges([])
    setView("board")
    getBoard()
  }

  const isActive = currentBoardId === boardId && view === "board"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className='text-xs font-medium truncate'
        isActive={isActive}
      >
        <Share2 className='shrink-0' strokeWidth={1.75} />
        <span>{trimText(label || UNTITLED_LABEL, 20)}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal className='size-4' strokeWidth={1.75} />
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


/**
 * New chat item component
 */
function NewChatItem() {
  const view = useAppStore((state) => state.view)
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId)
  const setView = useAppStore((state) => state.setView)

  const currentChatId = useChatStore((state) => state.currentChatId)

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

  const chatLabel = trimText(label || UNTITLED_LABEL,100)

  const isActive = currentChatId === chatId && view === "chat"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className='transition-all text-xs font-medium truncate'
        isActive={isActive}
      >
        <span>{chatLabel}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal className='size-4' strokeWidth={1.75} />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => handleDeleteChat(chatId)}>
            <span>Delete Chat</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}


/**
 * App sidebar component
 */
export function AppSidebar() {
  const userId = useAppStore((state) => state.userId)

  const { data: chats } = useListChats({ userId })

  const { data: boards } = useListBoards({ userId })

  const chatItems = chats?.map((chat) => <ChatMenuItem key={chat.uid} chatId={chat.uid} label={chat.label} />) || []
  const boardItems = boards?.map((board) => {
    return <BoardItem key={board.id} boardId={board.id} label={board.label} />
  }) || []

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <ScrollArea className='h-full'>
        <div className='w-(--sidebar-width)'>
          <SidebarContent className='w-full'>
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
                    className="group/collapsible w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuItem>
                        <SidebarMenuButton className='font-medium text-xs flex flex-row items-center w-full'>
                          <History className='size-4 shrink-0' strokeWidth={1.75} />
                          <span>Chat History</span>
                          <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" strokeWidth={1.75} />
                          <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" strokeWidth={1.75} />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {chatItems}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </div>
      </ScrollArea>
    </Sidebar>
  )
}