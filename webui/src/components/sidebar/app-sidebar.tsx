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
import { Minus, Plus } from "lucide-react"
import { useListBoards } from "@/features/board/api/list-boards"
import { Collapsible, CollapsibleTrigger } from "../ui/collapsible"
import { CollapsibleContent } from "@radix-ui/react-collapsible"
import { ScrollArea } from "../ui/scroll-area"
import { ChatMenuItem, NewChatItem } from "./chat"
import { BoardItem, DashboardMenuItem, NewBoardItem } from "./board"
import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Clock02Icon } from "@hugeicons/core-free-icons"


/**
 * App sidebar component
 */
export function AppSidebar() {
  const userId = useAppStore((s) => s.userId)

  const { data: chats = [] } = useListChats({ userId })
  const { data: boards = [] } = useListBoards({ userId })

  const { chatHistoryItems, chatsByBoard } = useMemo(() => {
    // Group chats by graphUid once
    const map = new Map<string, typeof chats>()
    const history: typeof chats = []

    for (const chat of chats) {
      const gid = chat.graphUid ?? null
      if (gid == null) {
        history.push(chat)
      } else {
        const bucket = map.get(gid) ?? []
        bucket.push(chat)
        map.set(gid, bucket)
      }
    }

    return { chatHistoryItems: history, chatsByBoard: map }
  }, [chats])

  const chatItems = useMemo(
    () =>
      chatHistoryItems.map((chat) => (
        <ChatMenuItem
          key={chat.uid}
          chatId={chat.uid}
          label={chat.label}
        />
      )),
    [chatHistoryItems]
  )

  const boardItems = useMemo(
    () =>
      boards.map((board) => (
        <BoardItem
          key={board.uid}
          boardId={board.uid}
          label={board.label}
          // read from the prebuilt map in O(1)
          chats={chatsByBoard.get(board.uid) ?? []}
        />
      )),
    [boards, chatsByBoard]
  )

  return (
    <Sidebar variant="inset" collapsible="icon">
      <ScrollArea className="h-full w-full flex flex-row">
        <SidebarContent className="w-[calc(var(--sidebar-width)-theme(spacing.2)*2)]">
          <SidebarGroup>
            <SidebarGroupLabel>
              <span>Workspace</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <DashboardMenuItem />
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
                <Collapsible className="group/collapsible w-full">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="font-medium text-xs flex flex-row items-center w-full">
                        <HugeiconsIcon icon={Clock02Icon} className="size-4 shrink-0" strokeWidth={1.75} />
                        <span>Chat History</span>
                        <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" strokeWidth={1.75} />
                        <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" strokeWidth={1.75} />
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