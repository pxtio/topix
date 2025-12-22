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
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { useInfiniteChats } from '@/features/agent/api/list-chats'
import { useAppStore } from '@/store'
import { useListBoards } from '@/features/board/api/list-boards'
import { Collapsible, CollapsibleTrigger } from '../ui/collapsible'
import { CollapsibleContent } from '@radix-ui/react-collapsible'
import { ScrollArea } from '../ui/scroll-area'
import { ChatMenuItem, NewChatItem } from './chat'
import { BoardItem, DashboardMenuItem, NewBoardItem } from './board'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Chat } from '@/features/agent/types/chat'
import { HugeiconsIcon } from '@hugeicons/react'
import { Clock02Icon, LogoutSquareIcon, MinusSignIcon, PlusSignIcon, Settings01Icon, UserIcon } from '@hugeicons/core-free-icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SubscriptionsMenuItem } from './subscription'
import { ModeToggle } from '@/components/mode-toggle'
import { HomeMenuItem } from './home'
import { useCheckEleInView } from '@/hooks/use-check-ele-in-view'


/**
 * Props for the AppSidebar component.
 *
 * @property onLogout - Callback function to handle user logout.
 */
type AppSidebarProps = {
  onLogout: () => void
}


/**
 * Application Sidebar Component.
 */
const CHAT_HISTORY_PAGE_SIZE = 50

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const userEmail = useAppStore(s => s.userEmail)

  const initials = useMemo(() => {
    if (!userEmail) return 'U'
    const name = userEmail.split('@')[0] || 'user'
    return name.slice(0, 2).toUpperCase()
  }, [userEmail])

  const [scrollViewport, setScrollViewport] = useState<HTMLDivElement | null>(null)
  const handleScrollAreaRef = useCallback((node: HTMLDivElement | null) => {
    setScrollViewport(node)
  }, [])

  const { data: chatPagesData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteChats({
    pageSize: CHAT_HISTORY_PAGE_SIZE,
    graphUid: "none"
  })
  const { data: boards = [] } = useListBoards()
  const { ref: sentinelRef, inView: isSentinelInView } = useCheckEleInView<HTMLDivElement>({
    root: scrollViewport,
    margin: '0px 0px -20% 0px'
  })

  const chatHistoryItems = useMemo<Chat[]>(
    () => chatPagesData?.pages.flat() ?? [],
    [chatPagesData]
  )

  useEffect(() => {
    if (!isSentinelInView) return
    if (!hasNextPage) return
    if (isFetchingNextPage) return
    fetchNextPage()
  }, [isSentinelInView, hasNextPage, isFetchingNextPage, fetchNextPage])

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
      />
    )),
    [boards]
  )

  return (
    <Sidebar variant="inset" collapsible="icon">
      <ScrollArea ref={handleScrollAreaRef} className="h-full w-full flex flex-row">
        <SidebarContent className="w-[calc(var(--sidebar-width)-theme(spacing.2)*2)]">

          {/* User section (top) */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 w-full">
                    {/* Dropdown trigger: avatar + ellipsized email */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton className="flex items-center gap-2 font-medium text-xs min-w-0">
                          <Avatar className="h-8 w-8 -ml-2 shrink-0">
                            <AvatarImage alt={userEmail} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <span
                            className="truncate block flex-1 min-w-0"
                            title={userEmail}
                          >
                            {userEmail}
                          </span>
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="right" className="w-56">
                        <DropdownMenuItem disabled className='text-xs'>
                          <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" strokeWidth={2} />
                          <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled className='text-xs'>
                          <HugeiconsIcon icon={Settings01Icon} className="mr-2 h-4 w-4" strokeWidth={2} />
                          <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onLogout} className='text-xs'>
                          <HugeiconsIcon icon={LogoutSquareIcon} className="mr-2 h-4 w-4" strokeWidth={2} />
                          <span>Logout</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Theme toggle sits to the right, not part of the trigger */}
                    <div className="ml-auto shrink-0">
                      <ModeToggle aria-label="Toggle theme" />
                    </div>
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Workspace */}
          <SidebarGroup>
            <SidebarGroupLabel><span>Workspace</span></SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <HomeMenuItem />
                <SubscriptionsMenuItem />
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
                        <HugeiconsIcon icon={Clock02Icon} className="size-4 shrink-0" strokeWidth={2} />
                        <span>Chat History</span>
                        <HugeiconsIcon icon={PlusSignIcon} className="ml-auto group-data-[state=open]/collapsible:hidden" strokeWidth={2} />
                        <HugeiconsIcon icon={MinusSignIcon} className="ml-auto group-data-[state=closed]/collapsible:hidden" strokeWidth={2} />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {chatItems}
                      <SidebarMenuSubItem aria-hidden className="pointer-events-none">
                        <div ref={sentinelRef} className="h-4 w-full opacity-0" />
                      </SidebarMenuSubItem>
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
