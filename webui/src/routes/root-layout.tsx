import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarLabel } from "@/components/sidebar/sidebar-label"
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { StyleDefaultsProvider } from '@/features/board/style-provider'

// 👉 passive bootstrap (fills store from token, no redirects)
import { useAppStore } from '@/store'
import { clearTokens } from '@/features/signin/auth-storage'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/signin/hooks/auth'

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
                <header className="flex h-16 shrink-0 items-center gap-2 p-4 absolute top-0 inset-x-0 z-50">
                  <SidebarTrigger className="-ml-1" />
                  <div><SidebarLabel /></div>
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
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let rAF = 0
    let timer: number | undefined

    const makeGrain = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap for perf
      const width = Math.ceil(window.innerWidth * dpr)
      const height = Math.ceil(window.innerHeight * dpr)

      // downscale factor to keep perf while preserving fine grain
      const scale = 0.75 // 1 = max detail; lower = faster
      const w = Math.max(1, Math.floor(width * scale))
      const h = Math.max(1, Math.floor(height * scale))

      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return

      const img = ctx.createImageData(w, h)
      const buf = img.data

      // tiny but denser specks
      const density = 0.18 // 0..1
      const alphaMin = 18
      const alphaMax = 45

      for (let i = 0; i < buf.length; i += 4) {
        const on = Math.random() < density
        const val = on ? 255 : 0
        buf[i] = val
        buf[i + 1] = val
        buf[i + 2] = val
        buf[i + 3] = on
          ? alphaMin + Math.floor(Math.random() * (alphaMax - alphaMin))
          : 0
      }

      ctx.putImageData(img, 0, 0)
      setDataUrl(canvas.toDataURL("image/png"))
    }

    const debouncedMake = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        rAF = window.requestAnimationFrame(makeGrain)
      }, 120)
    }

    // initial render
    debouncedMake()
    window.addEventListener("resize", debouncedMake)

    return () => {
      window.removeEventListener("resize", debouncedMake)
      if (timer) window.clearTimeout(timer)
      if (rAF) window.cancelAnimationFrame(rAF)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* soft secondary blobs */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[40vh] w-[70vw] rounded-full bg-secondary/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-[45vh] w-[55vw] rounded-full bg-secondary/15 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-[35vh] w-[45vw] rounded-full bg-secondary/10 blur-3xl" />

      {/* seamless grain overlay (no tiling) */}
      <div
        className="absolute inset-0 opacity-35 mix-blend-multiply"
        style={
          dataUrl
            ? {
                backgroundImage: `url(${dataUrl})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : undefined
        }
      />
    </div>
  )
}