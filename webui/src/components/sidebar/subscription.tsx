import { HugeiconsIcon } from "@hugeicons/react"
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { DashboardSquare03Icon } from "@hugeicons/core-free-icons"

/**
 * Subscriptions menu item component
 */
export function SubscriptionsMenuItem() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isActive = pathname === `/subscriptions`

  const handleClick = () => {
    navigate({ to: '/subscriptions' })
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className="text-xs font-medium truncate"
        isActive={isActive}
      >
        <HugeiconsIcon icon={DashboardSquare03Icon} className="shrink-0 size-4 text-sidebar-icon-3" strokeWidth={2} />
        <span>Newsfeed</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}