function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
}


const runtime =
  typeof window !== "undefined" ? window.__APP_CONFIG__?.billingEnabled : undefined


export const BILLING_ENABLED = isTruthy(runtime || import.meta.env.VITE_BILLING_ENABLED)
