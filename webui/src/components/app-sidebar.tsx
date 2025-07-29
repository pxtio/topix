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
import { BotMessageSquare, MoreHorizontal, PencilLine } from "lucide-react"
import { Collapsible } from "./ui/collapsible"
import { useChatStore } from "@/features/agent/store/chat-store"
import { trimText } from "@/lib/common"
import { CollapsibleContent } from "@radix-ui/react-collapsible"


function NewChatItem() {
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className='text-xs font-medium'
        onClick={() => setCurrentChatId(undefined)}
      >
        <PencilLine className='text-xs shrink-0' strokeWidth={1.75} />
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

  const chatItems = chats?.map((chat) => <ChatMenuItem key={chat.uid} chatId={chat.uid} label={chat.label} />) || []

  return (
    <Sidebar variant='floating' collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Platform</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NewChatItem />
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <SidebarMenuButton className='font-medium text-xs'>
                    <BotMessageSquare className='flex-shrink-0' strokeWidth={1.75}/>
                    <span>Chats</span>
                  </SidebarMenuButton>
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