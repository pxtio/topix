import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BILLING_ENABLED } from "@/config/billing"
import { TierBadge } from "@/features/user-settings/components/tier-badge"
import { useAppStore } from "@/store"


export function SettingsScreen() {
  const navigate = useNavigate()
  const userEmail = useAppStore(s => s.userEmail)
  const userPlan = useAppStore(s => s.userPlan)

  return (
    <div className="absolute inset-0 overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-4xl px-6 py-24 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
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
                <TierBadge plan={userPlan} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {BILLING_ENABLED ? (
          <Card>
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
