import { Outlet } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarLabel } from "@/components/sidebar/sidebar-label"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

export function RootLayout() {
  return (
    <ThemeProvider>
      <main>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex flex-col h-screen z-40">
            <header className="flex h-1/13 shrink-0 items-center gap-2 border-b px-4 w-full">
              <SidebarTrigger className="-ml-1" />
              <div>
                <SidebarLabel />
              </div>
              <div className="ml-auto">
                <ModeToggle />
              </div>
            </header>

            {/* 👇 Active route gets rendered here */}
            <div className="flex flex-1 w-full h-10/13 relative min-w-0 p-4 items-center justify-center">
              <div className="flex inset-0 h-full w-full items-center justify-center overflow-y-scroll">
                <Outlet />
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </main>
      <Toaster position="top-center" />
    </ThemeProvider>
  )
}
