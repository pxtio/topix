import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate, Link } from "@tanstack/react-router"
import { decodeJwt } from "@/lib/decode-jwt"
import { useAppStore } from "@/store"
import { signup } from "@/api"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon, UserIcon, UserSquareIcon, LockIcon } from "@hugeicons/core-free-icons"
import { Loader2 } from "lucide-react"

import { PasswordInput } from "../components/password-input"

export function SignupPage() {
  const navigate = useNavigate()
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)

  const [name, setName] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const mut = useMutation({
    mutationFn: () => signup({ email, password, name, username }),
    onSuccess: token => {
      const p = decodeJwt(token.access_token)
      if (p.sub) setUserId(String(p.sub))
      if (typeof p.email === "string") setUserEmail(p.email)
      navigate({ to: "/chats", replace: true })
    }
  })

  return (
    <div className="relative h-svh grid place-items-center px-4 overflow-hidden">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <CardHeader>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Start organizing your chats and boards</CardDescription>
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
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <Input
                    id="name"
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="pl-9"
                  />
                  <HugeiconsIcon
                    icon={UserIcon}
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder="ada_l"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="pl-9"
                  />
                  <HugeiconsIcon
                    icon={UserSquareIcon}
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                </div>
              </div>

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
                    className="pl-9"
                  />
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    strokeWidth={1.75}
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
                    className="pl-9 pr-9"
                  />
                  <HugeiconsIcon
                    icon={LockIcon}
                    className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                </div>
              </div>

              {mut.isError ? (
                <p className="text-sm text-red-600">
                  {(mut.error as Error).message || "Unable to sign up"}
                </p>
              ) : null}

              <Button type="submit" className="w-full rounded-md" disabled={mut.isPending}>
                {mut.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </span>
                ) : (
                  "Create account"
                )}
              </Button>

              <Separator />

              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className="font-medium underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}