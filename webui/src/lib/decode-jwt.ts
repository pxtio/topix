export type JwtPayload = Record<string, unknown> & {
  sub?: string
  email?: string
  name?: string
  username?: string
  exp?: number
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  )
}

export function decodeJwt<T extends JwtPayload = JwtPayload>(token: string): T {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT")
  const payloadStr = base64UrlDecode(parts[1])
  return JSON.parse(payloadStr) as T
}