import { useNavigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Current plan</span>
              <Badge variant={userPlan === "plus" ? "default" : "secondary"}>
                {userPlan === "plus" ? "Plus" : "Free"}
              </Badge>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </div>
  )
}
