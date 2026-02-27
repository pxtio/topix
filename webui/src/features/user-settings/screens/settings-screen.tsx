import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BILLING_ENABLED } from "@/config/billing"
import { getBillingSummary, type BillingSummary } from "@/features/user-settings/api/billing"
import { TierBadge } from "@/features/user-settings/components/tier-badge"
import { useAppStore } from "@/store"


export function SettingsScreen() {
  const navigate = useNavigate()
  const userEmail = useAppStore(s => s.userEmail)
  const userPlan = useAppStore(s => s.userPlan)
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null)

  useEffect(() => {
    if (!BILLING_ENABLED) return

    void (async () => {
      try {
        const summary = await getBillingSummary()
        setBillingSummary(summary)
      } catch {
        setBillingSummary(null)
      }
    })()
  }, [])

  const expiresAtLabel = useMemo(() => {
    if (!billingSummary?.cancel_at_period_end) return null
    if (!billingSummary.current_period_end) return "Expires at period end"
    return `Expires on ${new Date(billingSummary.current_period_end).toLocaleDateString()}`
  }, [billingSummary])

  return (
    <div className="absolute inset-0 overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-4xl px-6 py-24 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
            {BILLING_ENABLED ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Current plan</span>
                <div className="flex items-center gap-2">
                  <TierBadge plan={userPlan} />
                  {expiresAtLabel ? (
                    <Badge variant="outline" className="font-mono font-medium tracking-wide">
                      {expiresAtLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {BILLING_ENABLED ? (
          <Card className="border-secondary/60 bg-gradient-to-br from-secondary/20 via-secondary/10 to-card">
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Manage subscription and usage limits</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate({ to: "/settings/billing" })}>
                Open billing
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
