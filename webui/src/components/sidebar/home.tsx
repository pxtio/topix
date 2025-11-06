import { HugeiconsIcon } from "@hugeicons/react"
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"
import { useNavigate } from "@tanstack/react-router"
import { Home12Icon } from "@hugeicons/core-free-icons"

export const HomeMenuItem = () => {
  const navigate = useNavigate()

  const handleClick = async () => {
    navigate({ to: '/home' })
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="text-xs text-secondary font-medium transition-all" onClick={handleClick}>
        <HugeiconsIcon icon={Home12Icon} className="text-xs shrink-0 text-sidebar-icon-1" strokeWidth={2} />
        <span>Home</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}