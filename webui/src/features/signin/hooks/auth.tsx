import { useAppStore } from "@/store"
import { clearTokens, getAccessToken } from "../auth-storage"
import { useEffect } from "react"
import { decodeJwt, resolveBillingPlan } from "@/lib/decode-jwt"


/**
 * A hook to bootstrap authentication state from stored tokens.
 */
export function useAuth() {
  const setUserId = useAppStore(s => s.setUserId)
  const setUserEmail = useAppStore(s => s.setUserEmail)
  const setUserPlan = useAppStore(s => s.setUserPlan)

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
      setUserPlan(resolveBillingPlan(payload))
    } catch {
      // bad token -> clear
      clearTokens()
    }
  }, [setUserEmail, setUserId, setUserPlan])
}
