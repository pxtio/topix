import { Outlet } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarLabel } from "@/components/sidebar/sidebar-label"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { StyleDefaultsProvider } from '@/features/board/style-provider'

export function RootLayout() {
  return (
    <ThemeProvider>
      <StyleDefaultsProvider>
        <main>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className='overflow-hidden'>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <div>
                  <SidebarLabel />
                </div>
                <div className="ml-auto">
                  <ModeToggle />
                </div>
              </header>

              {/* Active route gets rendered here */}
              <div className="flex flex-1 w-full relative min-w-0">
                <div className='absolute inset-0 h-full w-full overflow-hidden'>
                  <Outlet />
                </div>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      borderRadius: 'var(--radius-xl)',
                      top: '3rem',
                    },
                  }}
                />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </main>
      </StyleDefaultsProvider>
    </ThemeProvider>
  )
}
