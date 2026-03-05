import { Badge } from "@/components/ui/badge"
import { BILLING_ENABLED } from "@/config/billing"
import type { BillingPlan } from "@/lib/decode-jwt"
import { HugeiconsIcon } from "@hugeicons/react"
import { Crown03Icon } from "@hugeicons/core-free-icons"


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
      {plan === "plus" ? <HugeiconsIcon
        icon={Crown03Icon}
        className="h-3.5 w-3.5 text-secondary" /> : null}
      <span>{plan === "plus" ? "plus" : "free"}</span>
    </Badge>
  )
}
