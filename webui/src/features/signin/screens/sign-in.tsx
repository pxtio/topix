import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate, Link } from "@tanstack/react-router"
import { decodeJwt } from "@/lib/decode-jwt"
import { useAppStore } from "@/store"
import { signin } from "@/api"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon, LockIcon } from "@hugeicons/core-free-icons"
import { Loader2 } from "lucide-react"
import { PasswordInput } from "../components/password-input"

export function SigninPage() {
  const navigate = useNavigate()
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const mut = useMutation({
    mutationFn: () => signin(email, password),
    onSuccess: token => {
      const p = decodeJwt(token.access_token)
      if (p.sub) setUserId(String(p.sub))
      if (typeof p.email === "string") setUserEmail(p.email)
      navigate({ to: "/chats", replace: true })
    }
  })

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
              mut.mutate()
            }}
          >
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

            {mut.isError ? (
              <p className="text-sm text-destructive">
                {(mut.error as Error).message || "Unable to sign in"}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={mut.isPending}>
              {mut.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>

            <Separator />

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