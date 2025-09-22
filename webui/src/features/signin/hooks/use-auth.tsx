import { useAppStore } from "@/store"
import { clearTokens, getAccessToken } from "../auth-storage"
import { useEffect } from "react"
import { decodeJwt } from "@/lib/decode-jwt"


/**
 * A hook to bootstrap authentication state from stored tokens.
 */
export function useAuth() {
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)

  // run once on mount
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    try {
      const payload = decodeJwt(token)
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // expired -> clear
        clearTokens()
        return
      }
      if (payload.sub) setUserId(payload.sub)
      if (typeof payload.email === "string") setUserEmail(payload.email)
    } catch {
      // bad token -> clear
      clearTokens()
    }
  }, [setUserEmail, setUserId])
}