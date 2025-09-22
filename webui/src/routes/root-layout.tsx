import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarLabel } from "@/components/sidebar/sidebar-label"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { StyleDefaultsProvider } from '@/features/board/style-provider'

// 👉 passive bootstrap (fills store from token, no redirects)
import { useAppStore } from '@/store'
import { clearTokens } from '@/features/signin/auth-storage'
import { useCallback, useMemo } from 'react'
import { useAuth } from '@/features/signin/hooks/use-auth'

export function RootLayout() {
  // only hydrates store from token; does not navigate
  useAuth()

  const navigate = useNavigate()
  const { location } = useRouterState()

  // Zustand state
  const userId = useAppStore(s => s.userId)
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)

  const onLogout = useCallback(() => {
    clearTokens()
    setUserId('root')
    setUserEmail('root@localhost')
    navigate({ to: '/signin', replace: true })
  }, [navigate, setUserEmail, setUserId])

  const isAuthed = userId !== 'root'

  // do not show shell on auth pages (prevents flicker / overlap)
  const onAuthPage = useMemo(
    () => location.pathname === '/signin' || location.pathname === '/signup',
    [location.pathname]
  )
  const showShell = isAuthed && !onAuthPage

  return (
    <ThemeProvider>
      <StyleDefaultsProvider>
        <main>
          {showShell ? (
            <SidebarProvider>
              <AppSidebar onLogout={onLogout} />
              <SidebarInset className='overflow-hidden'>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                  <SidebarTrigger className="-ml-1" />
                  <div><SidebarLabel /></div>
                  <div className="ml-auto"><ModeToggle /></div>
                </header>

                <div className="flex flex-1 w-full min-w-0">
                  <div className="flex-1 min-w-0">
                    <Outlet />
                  </div>
                  <Toaster position="top-right" toastOptions={{ style: { borderRadius: 'var(--radius-xl)', top: '3.6rem' } }} />
                </div>
              </SidebarInset>
            </SidebarProvider>
          ) : (
            <div className="fixed inset-0">
              <AuthBackground />
              <div className="absolute inset-0 grid place-items-center px-4 overflow-hidden">
                <Outlet />
              </div>

              <Toaster
                position="top-right"
                toastOptions={{ style: { borderRadius: 'var(--radius-xl)', top: '3.6rem' } }}
              />
            </div>
          )}
        </main>
      </StyleDefaultsProvider>
    </ThemeProvider>
  )
}

export function AuthBackground() {
  const noise =
    "url(\"data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
        <filter id='n'>
          <feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/>
          <feColorMatrix type='saturate' values='0'/>
        </filter>
        <rect width='100%' height='100%' filter='url(%23n)' opacity='.06'/>
      </svg>`
    ) +
    "\")"

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* blob 1 (top center) */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[40vh] w-[70vw] rounded-full bg-secondary/25 blur-3xl" />
      {/* blob 2 (bottom-left) */}
      <div className="absolute -bottom-24 -left-24 h-[45vh] w-[55vw] rounded-full bg-secondary/20 blur-3xl" />
      {/* blob 3 (bottom-right, faint) */}
      <div className="absolute -bottom-40 -right-40 h-[35vh] w-[45vw] rounded-full bg-secondary/10 blur-3xl" />

      {/* grain */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-multiply"
        style={{ backgroundImage: noise }}
      />
    </div>
  )
}
