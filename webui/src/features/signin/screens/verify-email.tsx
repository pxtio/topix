import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Loader2, MailCheck } from "lucide-react"

import { getEmailVerificationStatus, resendVerificationEmail, verifyEmailToken } from "@/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { clearTokens } from "@/features/signin/auth-storage"
import { useAppStore } from "@/store"


export function VerifyEmailPage() {
  /** Render a verification gate screen until the account email is confirmed. */
  const navigate = useNavigate()
  const userEmail = useAppStore(s => s.userEmail)
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)
  const setUserPlan = useAppStore(s => s.setUserPlan)
  const setEmailVerificationEnabled = useAppStore(s => s.setEmailVerificationEnabled)
  const setEmailVerified = useAppStore(s => s.setEmailVerified)

  const [infoMessage, setInfoMessage] = React.useState<string | null>(null)
  const triedTokenVerificationRef = React.useRef(false)

  const resendMut = useMutation({
    mutationFn: async () => resendVerificationEmail(),
    onSuccess: () => setInfoMessage("Verification email sent. Please check your inbox."),
  })

  const verifyTokenMut = useMutation({
    mutationFn: async (token: string) => verifyEmailToken(token),
    onSuccess: () => {
      setEmailVerificationEnabled(true)
      setEmailVerified(true)
      setInfoMessage("Email verified successfully. Redirecting...")
      navigate({ to: "/chats", replace: true })
    },
    onError: () => {
      setInfoMessage("Verification link is invalid or expired.")
    },
  })

  const checkMut = useMutation({
    mutationFn: async () => getEmailVerificationStatus(),
    onSuccess: status => {
      setEmailVerificationEnabled(status.enabled)
      setEmailVerified(status.verified)
      if (!status.enabled || status.verified) {
        navigate({ to: "/chats", replace: true })
        return
      }
      setInfoMessage("Email is still not verified yet.")
    },
  })

  React.useEffect(() => {
    /** Auto-consume verification token when user opens email link. */
    const token = new URLSearchParams(window.location.search).get("token")
    if (!token) return
    if (triedTokenVerificationRef.current) return
    triedTokenVerificationRef.current = true
    verifyTokenMut.mutate(token)
  }, [verifyTokenMut])

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-card text-card-foreground border border-border shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <MailCheck className="h-6 w-6 text-secondary" />
            Verify your email
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            We sent a verification link to <span className="font-medium text-foreground">{userEmail}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {resendMut.isError ? (
            <p className="text-sm text-destructive">
              {(resendMut.error as Error).message || "Could not resend verification email."}
            </p>
          ) : null}

          {verifyTokenMut.isError ? (
            <p className="text-sm text-destructive">
              {(verifyTokenMut.error as Error).message || "Could not verify email token."}
            </p>
          ) : null}

          {checkMut.isError ? (
            <p className="text-sm text-destructive">
              {(checkMut.error as Error).message || "Could not check verification status."}
            </p>
          ) : null}

          {infoMessage ? (
            <p className="text-sm text-muted-foreground">{infoMessage}</p>
          ) : null}

          {verifyTokenMut.isPending ? (
            <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying email...
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resendMut.isPending}
            onClick={() => {
              setInfoMessage(null)
              resendMut.mutate()
            }}
          >
            {resendMut.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              "Resend verification email"
            )}
          </Button>

          <Separator />

          <Button
            type="button"
            className="w-full"
            disabled={checkMut.isPending}
            onClick={() => {
              setInfoMessage(null)
              checkMut.mutate()
            }}
          >
            {checkMut.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </span>
            ) : (
              "I've verified, continue"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              clearTokens()
              setUserId("root")
              setUserEmail("root@localhost")
              setUserPlan("free")
              setEmailVerificationEnabled(false)
              setEmailVerified(true)
              navigate({ to: "/signin", replace: true })
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
