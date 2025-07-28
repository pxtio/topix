import { Plus } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useListChats } from "@/features/agent/api/list-chats"
import { useAppStore } from "@/store"


export function AppSidebar() {
  const userId = useAppStore((state) => state.userId)
  const { data: chats } = useListChats({ userId })

  const chatItems = chats?.map((chat) => <SidebarMenuItem key={chat.uid}>
    <SidebarMenuButton asChild>
      <span>{chat.label || "Untitled chat"}</span>
    </SidebarMenuButton>
  </SidebarMenuItem>)
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Chats</span>
          </SidebarGroupLabel>
          <SidebarGroupAction>
            <Plus /> <span className="sr-only">Add Chat</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {chatItems}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}