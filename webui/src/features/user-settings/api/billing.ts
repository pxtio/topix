import { apiFetch } from "@/api"


type StandardResponse<TData> = {
  status: "success" | "error"
  data: TData
}


type CheckoutSessionData = {
  checkout_url?: string
  session_id?: string
}


type PortalSessionData = {
  portal_url?: string
}

export type BillingSummary = {
  plan: "free" | "plus"
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete"
  cancel_at_period_end: boolean
  current_period_start: string | null
  current_period_end: string | null
}


export async function createCheckoutSession(body?: {
  success_url?: string
  cancel_url?: string
}): Promise<CheckoutSessionData> {
  const res = await apiFetch<StandardResponse<CheckoutSessionData>, typeof body>({
    path: "/billing/checkout-session",
    method: "POST",
    body,
  })
  return res.data
}


export async function createPortalSession(body?: {
  return_url?: string
}): Promise<PortalSessionData> {
  const res = await apiFetch<StandardResponse<PortalSessionData>, typeof body>({
    path: "/billing/portal-session",
    method: "POST",
    body,
  })
  return res.data
}


export async function getBillingSummary(): Promise<BillingSummary> {
  const res = await apiFetch<StandardResponse<BillingSummary>>({
    path: "/billing/me",
    method: "GET",
  })
  return res.data
}
