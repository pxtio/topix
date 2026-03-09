declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiBase?: string
      googleClientId?: string
      billingEnabled?: string
    }
  }
}

const runtime =
  typeof window !== "undefined" ? window.__APP_CONFIG__?.apiBase : undefined

export const API_URL =
  runtime || import.meta.env.VITE_API_URL || "http://localhost:8888"
