import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import { useListChats } from "@/features/agent/api/list-chats"
import { useAppStore } from "@/store"
import { History, Minus, Plus } from "lucide-react"
import { useListBoards } from "@/features/board/api/list-boards"
import { Collapsible, CollapsibleTrigger } from "../ui/collapsible"
import { CollapsibleContent } from "@radix-ui/react-collapsible"
import { ScrollArea } from "../ui/scroll-area"
import { ChatMenuItem, NewChatItem } from "./chat"
import { BoardItem, NewBoardItem } from "./board"


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
    <Sidebar variant="floating" collapsible="icon">
      <ScrollArea className='h-full w-full flex flex-row'>
        <SidebarContent className='w-[calc(var(--sidebar-width)-theme(spacing.2)*2)]'>
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
                    <SidebarMenuSub>
                      {chatItems}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  )
}