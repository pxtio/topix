import * as React from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate, Link } from "@tanstack/react-router"
import { decodeJwt, resolveBillingPlan } from "@/lib/decode-jwt"
import { useAppStore } from "@/store"
import { getAuthMethods, getEmailVerificationStatus, googleSignin, type TokenPayload, signin } from "@/api"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon, LockIcon } from "@hugeicons/core-free-icons"
import { Loader2 } from "lucide-react"
import { PasswordInput } from "../components/password-input"
import { renderGoogleSigninButton } from "../lib/google-connect"

export function SigninPage() {
  const navigate = useNavigate()
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)
  const setUserPlan = useAppStore(s => s.setUserPlan)
  const setEmailVerificationEnabled = useAppStore(s => s.setEmailVerificationEnabled)
  const setEmailVerified = useAppStore(s => s.setEmailVerified)
  const googleButtonRef = React.useRef<HTMLDivElement | null>(null)

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [googleError, setGoogleError] = React.useState<string | null>(null)

  const authMethodsQuery = useQuery({
    queryKey: ["auth-methods"],
    queryFn: getAuthMethods,
  })

  const completeSignin = React.useCallback(async (token: TokenPayload) => {
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
  }, [navigate, setEmailVerificationEnabled, setEmailVerified, setUserEmail, setUserId, setUserPlan])

  const localSigninMutation = useMutation({
    mutationFn: () => signin(email, password),
    onMutate: () => setGoogleError(null),
    onSuccess: completeSignin,
  })

  const googleSigninMutation = useMutation({
    mutationFn: (idToken: string) => googleSignin(idToken),
    onMutate: () => setGoogleError(null),
    onSuccess: completeSignin,
    onError: error => {
      setGoogleError((error as Error).message || "Unable to continue with Google")
    },
  })

  React.useEffect(() => {
    const authMethods = authMethodsQuery.data
    const target = googleButtonRef.current
    if (!authMethods?.google || !authMethods.google_client_id || !target) return

    let cancelled = false
    renderGoogleSigninButton({
      clientId: authMethods.google_client_id,
      element: target,
      onCredential: response => {
        if (cancelled) return
        if (!response.credential) {
          setGoogleError("Google did not return a credential")
          return
        }
        googleSigninMutation.mutate(response.credential)
      },
    }).catch(error => {
      if (cancelled) return
      setGoogleError((error as Error).message || "Unable to load Google sign in")
    })

    return () => {
      cancelled = true
    }
  }, [authMethodsQuery.data, googleSigninMutation])

  const authMethods = authMethodsQuery.data
  const showLocalSignin = authMethods?.local ?? true
  const showGoogleSignin = Boolean(authMethods?.google && authMethods.google_client_id)
  const showSeparator = showLocalSignin && showGoogleSignin
  const localError = localSigninMutation.isError
    ? (localSigninMutation.error as Error).message || "Unable to sign in"
    : null

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-card text-card-foreground border border-border shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex flex-col items-center justify-center gap-2">
            <img src="/dim0.svg" alt="Topix Logo" className="h-12 w-12 aspect-square object-contain" />
            <span className="text-muted-foreground">Welcome back!</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to continue to your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={e => {
              e.preventDefault()
              if (!showLocalSignin) return
              localSigninMutation.mutate()
            }}
          >
            {showLocalSignin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      className="pl-9"
                    />
                    <HugeiconsIcon
                      icon={Mail01Icon}
                      className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                      strokeWidth={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-9 pr-9"
                    />
                    <HugeiconsIcon
                      icon={LockIcon}
                      className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                      strokeWidth={2}
                    />
                  </div>
                </div>

                {localError ? (
                  <p className="text-sm text-destructive">
                    {localError}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={localSigninMutation.isPending || authMethodsQuery.isLoading}>
                  {localSigninMutation.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </>
            ) : null}

            {showSeparator ? (
              <div className="space-y-3">
                <Separator />
                <p className="text-center text-sm text-muted-foreground">or continue with</p>
              </div>
            ) : null}

            {showGoogleSignin ? (
              <div className="space-y-3">
                {googleError ? (
                  <p className="text-sm text-destructive">{googleError}</p>
                ) : null}
                <div className="w-full min-h-11" ref={googleButtonRef} />
                {googleSigninMutation.isPending ? (
                  <div className="flex items-center justify-center text-sm text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting to Google…
                  </div>
                ) : null}
              </div>
            ) : null}

            {!authMethodsQuery.isLoading && !showLocalSignin && !showGoogleSignin ? (
              <p className="text-sm text-destructive">
                No sign-in methods are currently available.
              </p>
            ) : null}

            {authMethodsQuery.isError ? (
              <p className="text-sm text-destructive">
                {(authMethodsQuery.error as Error).message || "Unable to load sign-in methods"}
              </p>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Don’t have an account?{" "}
                <Link to="/signup" className="font-medium underline">
                  Create one
                </Link>
              </span>
              <Link to="/forgot-password" className="text-muted-foreground underline">
                Forgot password?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
