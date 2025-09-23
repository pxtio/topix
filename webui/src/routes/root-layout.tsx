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
import { useCallback, useEffect, useMemo, useState } from 'react'
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
                  <div className="relative flex-1 min-w-0">
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

// grainy background for auth pages
/**
 * Full-screen auth background:
 * - soft "secondary" blobs
 * - subtle canvas-generated grain texture (PNG tile)
 */
export function AuthBackground() {
  const [urlA, setUrlA] = useState<string | null>(null)
  const [urlB, setUrlB] = useState<string | null>(null)
  const [posA, setPosA] = useState<string>("0px 0px")
  const [posB, setPosB] = useState<string>("0px 0px")

  useEffect(() => {
    const rand = (n: number) => Math.floor(Math.random() * n)
    setPosA(`${rand(80)}px ${rand(80)}px`)
    setPosB(`${rand(128)}px ${rand(128)}px`)

    const makeNoise = (size: number, density: number, aMin: number, aMax: number) => {
      const c = document.createElement("canvas")
      c.width = size
      c.height = size
      const ctx = c.getContext("2d", { willReadFrequently: true })
      if (!ctx) return null
      const img = ctx.createImageData(size, size)
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const on = Math.random() < density
        const v = on ? 255 : 0
        d[i] = v
        d[i + 1] = v
        d[i + 2] = v
        d[i + 3] = on ? aMin + Math.floor(Math.random() * (aMax - aMin)) : 0
      }
      ctx.putImageData(img, 0, 0)
      return c.toDataURL("image/png")
    }

    // Layer A: finer & denser (smaller tile => tiny grains)
    setUrlA(makeNoise(80, 0.20, 18, 42))
    // Layer B: larger tile, slightly sparser to break repetition
    setUrlB(makeNoise(128, 0.12, 14, 36))
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* soft secondary blobs */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[40vh] w-[70vw] rounded-full bg-secondary/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-[45vh] w-[55vw] rounded-full bg-secondary/15 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-[35vh] w-[45vw] rounded-full bg-secondary/10 blur-3xl" />

      {/* Noise layer A */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-multiply"
        style={
          urlA
            ? {
                backgroundImage: `url(${urlA})`,
                backgroundRepeat: "repeat",
                backgroundSize: "80px 80px",
                backgroundPosition: posA,
                transform: "rotate(0.5deg) scale(1.01)",
                transformOrigin: "center",
              }
            : undefined
        }
      />

      {/* Noise layer B */}
      <div
        className="absolute inset-0 opacity-22 mix-blend-multiply"
        style={
          urlB
            ? {
                backgroundImage: `url(${urlB})`,
                backgroundRepeat: "repeat",
                backgroundSize: "128px 128px",
                backgroundPosition: posB,
                transform: "rotate(-0.6deg) scale(1.012)",
                transformOrigin: "center",
              }
            : undefined
        }
      />
    </div>
  )
}
