import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { decodeJwt, resolveBillingPlan } from "@/lib/decode-jwt"
import { useAppStore } from "@/store"
import { getEmailVerificationStatus, googleSignin } from "@/api"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

const GOOGLE_CLIENT_ID =
  (typeof window !== "undefined" && window.__APP_CONFIG__?.googleClientId) ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID

export function SigninPage() {
  const navigate = useNavigate()
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)
  const setUserPlan = useAppStore(s => s.setUserPlan)
  const setEmailVerificationEnabled = useAppStore(s => s.setEmailVerificationEnabled)
  const setEmailVerified = useAppStore(s => s.setEmailVerified)
  const btnRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCredentialResponse = useCallback(
    async (response: google.accounts.id.CredentialResponse) => {
      setError(null)
      setLoading(true)
      try {
        const token = await googleSignin(response.credential)
        const p = decodeJwt(token.access_token)
        if (p.sub) setUserId(String(p.sub))
        if (typeof p.email === "string") setUserEmail(p.email)
        setUserPlan(resolveBillingPlan(p))
        const status = await getEmailVerificationStatus()
        setEmailVerificationEnabled(status.enabled)
        setEmailVerified(status.verified)
        if (status.enabled && !status.verified) {
          navigate({ to: "/verify-email", replace: true })
          return
        }
        navigate({ to: "/chats", replace: true })
      } catch (e) {
        setError((e as Error).message || "Unable to sign in")
      } finally {
        setLoading(false)
      }
    },
    [navigate, setUserId, setUserEmail, setUserPlan, setEmailVerificationEnabled, setEmailVerified],
  )

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      })
      if (btnRef.current) {
        google.accounts.id.renderButton(btnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 380,
          text: "continue_with",
        })
      }
    }
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [handleCredentialResponse])

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-card text-card-foreground border border-border shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex flex-col items-center justify-center gap-2">
            <img src="/dim0.svg" alt="Topix Logo" className="h-12 w-12 aspect-square object-contain" />
            <span className="text-muted-foreground">Welcome!</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to continue to your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div ref={btnRef} />
          )}

          {!GOOGLE_CLIENT_ID && (
            <p className="text-sm text-destructive">
              Google Client ID is not configured (VITE_GOOGLE_CLIENT_ID)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
