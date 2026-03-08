import { BILLING_ENABLED } from "@/config/billing"
import type { BillingPlan } from "@/lib/decode-jwt"


export const FREE_PLAN_BOARD_LIMIT = 1

export const FREE_PLAN_BOARD_LIMIT_TOOLTIP =
  "1-board limit reached for free plan. Upgrade to Plus for unlimited limits, or self-host for your own unlimited setup."


export function isBoardCreationLimited(plan: BillingPlan, boardCount: number): boolean {
  return BILLING_ENABLED && plan === "free" && boardCount >= FREE_PLAN_BOARD_LIMIT
}
