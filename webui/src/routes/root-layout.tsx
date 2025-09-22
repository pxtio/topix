import { Outlet, useNavigate } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarLabel } from "@/components/sidebar/sidebar-label"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { StyleDefaultsProvider } from '@/features/board/style-provider'
import { useAuth } from '@/features/signin/hooks/use-auth'
import { useAppStore } from '@/store'
import { clearTokens } from '@/features/signin/auth-storage'
import { useCallback } from 'react'

/**
 * Root layout component that wraps the entire application.
 */
export function RootLayout() {
  useAuth()

  const navigate = useNavigate()
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)

  const onLogout = useCallback(() => {
    clearTokens()
    setUserId("root")
    setUserEmail("root@localhost")
    navigate({ to: "/signin", replace: true })
  }, [navigate, setUserEmail, setUserId])

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
                      top: '3.6rem',
                    },
                  }}
                />
              </div>

              {/* logout button, to be moved to profile menu */}
              <button onClick={onLogout} className="w-full rounded bg-red-600 text-white py-2 fixed top-4 right-4 z-50">
                Logout
              </button>
            </SidebarInset>
          </SidebarProvider>
        </main>
      </StyleDefaultsProvider>
    </ThemeProvider>
  )
}
