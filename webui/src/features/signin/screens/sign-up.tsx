// pages/SignupPage.tsx
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { decodeJwt } from "@/lib/decode-jwt"
import { signup } from "@/api"
import { useAppStore } from "@/store"
import { useState } from "react"

/**
 * Signup page component.
 */
export function SignupPage() {
  const navigate = useNavigate()
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)

  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [name, setName] = useState<string>("")
  const [username, setUsername] = useState<string>("")

  const mut = useMutation({
    mutationFn: async () => signup({ email, password, name, username }),
    onSuccess: token => {
      const payload = decodeJwt(token.access_token)
      if (payload.sub) setUserId(payload.sub)
      if (typeof payload.email === "string") setUserEmail(payload.email)
      navigate({ to: "/" })
    }
  })

  return (
    <div className="max-w-sm mx-auto mt-16 space-y-4">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault()
          mut.mutate()
        }}
      >
        <input
          className="w-full border rounded p-2"
          type="text"
          placeholder="name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="w-full border rounded p-2"
          type="text"
          placeholder="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          className="w-full border rounded p-2"
          type="email"
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button
          className="w-full rounded bg-black text-white py-2"
          type="submit"
          disabled={mut.isPending}
        >
          {mut.isPending ? "Creating..." : "Create account"}
        </button>
        {mut.isError ? (
          <p className="text-red-600 text-sm">
            {(mut.error as Error).message}
          </p>
        ) : null}
      </form>
      <p className="text-sm">
        Already have an account? <a className="underline" href="/signin">Sign in</a>
      </p>
    </div>
  )
}
