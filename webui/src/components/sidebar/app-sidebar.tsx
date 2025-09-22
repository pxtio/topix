// components/sidebar/app-sidebar.tsx
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
import { useListBoards } from "@/features/board/api/list-boards"
import { Collapsible, CollapsibleTrigger } from "../ui/collapsible"
import { CollapsibleContent } from "@radix-ui/react-collapsible"
import { ScrollArea } from "../ui/scroll-area"
import { ChatMenuItem, NewChatItem } from "./chat"
import { BoardItem, DashboardMenuItem, NewBoardItem } from "./board"
import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Clock02Icon, MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User, Settings } from "lucide-react"

type AppSidebarProps = {
  onLogout: () => void
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const userId = useAppStore(s => s.userId)
  const userEmail = useAppStore(s => s.userEmail)

  const initials = useMemo(() => {
    if (!userEmail) return "U"
    const name = userEmail.split("@")[0] || "user"
    return name.slice(0, 2).toUpperCase()
  }, [userEmail])

  const { data: chats = [] } = useListChats({ userId })
  const { data: boards = [] } = useListBoards({ userId })

  const { chatHistoryItems, chatsByBoard } = useMemo(() => {
    const map = new Map<string, typeof chats>()
    const history: typeof chats = []
    for (const chat of chats) {
      const gid = chat.graphUid ?? null
      if (gid == null) history.push(chat)
      else {
        const bucket = map.get(gid) ?? []
        bucket.push(chat)
        map.set(gid, bucket)
      }
    }
    return { chatHistoryItems: history, chatsByBoard: map }
  }, [chats])

  const chatItems = useMemo(
    () => chatHistoryItems.map(chat => (
      <ChatMenuItem key={chat.uid} chatId={chat.uid} label={chat.label} />
    )),
    [chatHistoryItems]
  )

  const boardItems = useMemo(
    () => boards.map(board => (
      <BoardItem
        key={board.uid}
        boardId={board.uid}
        label={board.label}
        chats={chatsByBoard.get(board.uid) ?? []}
      />
    )),
    [boards, chatsByBoard]
  )

  return (
    <Sidebar variant="inset" collapsible="icon">
      <ScrollArea className="h-full w-full flex flex-row">
        <SidebarContent className="w-[calc(var(--sidebar-width)-theme(spacing.2)*2)]">

          {/* User section (top) */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="flex items-center gap-2 font-medium text-xs">
                        <Avatar className="h-6 w-6">
                          <AvatarImage alt={userEmail} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{userEmail}</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right" className="w-56">
                      <DropdownMenuItem disabled>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Workspace */}
          <SidebarGroup>
            <SidebarGroupLabel><span>Workspace</span></SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <DashboardMenuItem />
                <NewBoardItem />
                {boardItems}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Chats */}
          <SidebarGroup>
            <SidebarGroupLabel><span>Chats</span></SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NewChatItem />
                <Collapsible className="group/collapsible w-full">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="font-medium text-xs flex flex-row items-center w-full">
                        <HugeiconsIcon icon={Clock02Icon} className="size-4 shrink-0" strokeWidth={1.75} />
                        <span>Chat History</span>
                        <HugeiconsIcon icon={PlusSignIcon} className="ml-auto group-data-[state=open]/collapsible:hidden" strokeWidth={1.75} />
                        <HugeiconsIcon icon={MinusSignIcon} className="ml-auto group-data-[state=closed]/collapsible:hidden" strokeWidth={1.75} />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>{chatItems}</SidebarMenuSub>
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
