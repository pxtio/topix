import { Crown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { BILLING_ENABLED } from "@/config/billing"
import type { BillingPlan } from "@/lib/decode-jwt"


type TierBadgeProps = {
  plan: BillingPlan
}


export function TierBadge({ plan }: TierBadgeProps) {
  if (!BILLING_ENABLED) return null

  return (
    <Badge
      variant="outline"
      className={[
        "font-mono font-medium uppercase tracking-wide",
        plan === "plus"
          ? "border-secondary bg-secondary/10 text-foreground"
          : "border-border bg-muted text-foreground",
      ].join(" ")}
    >
      {plan === "plus" ? <Crown className="h-3.5 w-3.5" /> : null}
      <span>{plan === "plus" ? "plus" : "free"}</span>
    </Badge>
  )
}
