import { useEffect, useMemo, useRef, useState } from "react"

import { refresh } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BILLING_ENABLED } from "@/config/billing"
import { createCheckoutSession, createPortalSession } from "@/features/user-settings/api/billing"
import { getAccessToken } from "@/features/signin/auth-storage"
import { decodeJwt, resolveBillingPlan } from "@/lib/decode-jwt"
import { useAppStore } from "@/store"


export function BillingScreen() {
  const userPlan = useAppStore(s => s.userPlan)
  const setUserPlan = useAppStore(s => s.setUserPlan)
  const [busyAction, setBusyAction] = useState<"upgrade" | "manage" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const refreshedAfterReturn = useRef(false)

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])

  useEffect(() => {
    if (!BILLING_ENABLED) return
    if (refreshedAfterReturn.current) return
    if (searchParams.get("checkout") !== "success") return

    refreshedAfterReturn.current = true
    void (async () => {
      try {
        await refresh()
        const token = getAccessToken()
        if (!token) return
        const payload = decodeJwt(token)
        setUserPlan(resolveBillingPlan(payload))
      } catch {
        setErrorMessage("Could not refresh billing plan after checkout.")
      }
    })()
  }, [searchParams, setUserPlan])

  const onUpgrade = async () => {
    setErrorMessage(null)
    setBusyAction("upgrade")
    try {
      const successUrl = `${window.location.origin}/settings/billing?checkout=success`
      const cancelUrl = `${window.location.origin}/settings/billing?checkout=cancel`
      const data = await createCheckoutSession({
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
      if (!data.checkout_url) throw new Error("No checkout url returned")
      window.location.assign(data.checkout_url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create checkout session.")
    } finally {
      setBusyAction(null)
    }
  }

  const onManage = async () => {
    setErrorMessage(null)
    setBusyAction("manage")
    try {
      const returnUrl = `${window.location.origin}/settings/billing`
      const data = await createPortalSession({ return_url: returnUrl })
      if (!data.portal_url) throw new Error("No portal url returned")
      window.location.assign(data.portal_url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not open billing portal.")
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="absolute inset-0 overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-5xl px-6 py-24 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>
              Choose your plan and manage your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current plan</span>
            <Badge variant={userPlan === "plus" ? "default" : "secondary"}>
              {userPlan === "plus" ? "Plus" : "Free"}
            </Badge>
          </CardContent>
        </Card>

        {!BILLING_ENABLED ? (
          <Card>
            <CardHeader>
              <CardTitle>Billing unavailable</CardTitle>
              <CardDescription>
                This deployment has billing disabled.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>Starter usage for personal testing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>10 requests / minute</p>
                <p>10 requests / day</p>
                <p>100 requests / month</p>
              </CardContent>
            </Card>

            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle>Plus</CardTitle>
                <CardDescription>Higher daily and monthly limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>10 requests / minute</p>
                  <p>200 requests / day</p>
                  <p>5000 requests / month</p>
                </div>

                {userPlan === "plus" ? (
                  <Button
                    variant="outline"
                    onClick={onManage}
                    disabled={busyAction !== null}
                    className="w-full"
                  >
                    {busyAction === "manage" ? "Opening portal..." : "Manage billing"}
                  </Button>
                ) : (
                  <Button
                    onClick={onUpgrade}
                    disabled={busyAction !== null}
                    className="w-full"
                  >
                    {busyAction === "upgrade" ? "Redirecting..." : "Upgrade to Plus"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  )
}
