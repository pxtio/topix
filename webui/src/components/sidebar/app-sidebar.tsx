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
import { ChatMenuItem, NewChatItem } from './chat'
import { BoardItem, DashboardMenuItem, NewBoardItem } from './board'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Chat } from '@/features/agent/types/chat'
import { HugeiconsIcon } from '@hugeicons/react'
import { Award04Icon, Clock02Icon, LogoutSquareIcon, MinusSignIcon, PlusSignIcon, UserIcon } from '@hugeicons/core-free-icons'
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
import { useNavigate } from '@tanstack/react-router'
import { BILLING_ENABLED } from '@/config/billing'
import { TierBadge } from '@/features/user-settings/components/tier-badge'


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
  const navigate = useNavigate()
  const userId = useAppStore(s => s.userId)
  const userEmail = useAppStore(s => s.userEmail)
  const userPlan = useAppStore(s => s.userPlan)

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
    graphUid: "none",
    userId
  })
  const { data: boards = [] } = useListBoards(userId)
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
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarContent className="w-[calc(var(--sidebar-width)-theme(spacing.2)*2)] h-full flex flex-col overflow-hidden">
        <SidebarGroup className="shrink-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-auto py-2"
                  onClick={() => navigate({ to: "/" })}
                >
                  <img src="/dim0.svg" alt="Topix Home" className="h-7 w-7 shrink-0" />
                  <span className="font-medium">Topix</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div ref={handleScrollAreaRef} className="min-h-0 flex-1">
          <div className="pb-2">
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
          </div>
        </div>

        <SidebarGroup className="shrink-0 border-t border-sidebar-border/50 pt-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 w-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="h-auto py-2 flex items-center gap-2 font-medium text-xs min-w-0 flex-1">
                        <Avatar className="h-8 w-8 -ml-2 shrink-0">
                          <AvatarImage alt={userEmail} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <span
                            className="truncate block"
                            title={userEmail}
                          >
                            {userEmail}
                          </span>
                          {BILLING_ENABLED ? (
                            <div className="mt-1">
                              <TierBadge plan={userPlan} />
                            </div>
                          ) : null}
                        </div>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-56">
                      <DropdownMenuItem
                        className='text-xs'
                        onClick={() => navigate({ to: "/settings" })}
                      >
                        <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" strokeWidth={2} />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      {BILLING_ENABLED ? (
                        <DropdownMenuItem
                          className='text-xs bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent text-secondary'
                          onClick={() => navigate({ to: "/settings/billing" })}
                        >
                          <HugeiconsIcon icon={Award04Icon} className="mr-2 h-4 w-4 text-secondary" strokeWidth={2} />
                          <span>Upgrade Plan</span>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onLogout} className='text-xs'>
                        <HugeiconsIcon icon={LogoutSquareIcon} className="mr-2 h-4 w-4" strokeWidth={2} />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="ml-auto shrink-0 pt-1">
                    <ModeToggle aria-label="Toggle theme" />
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
