import { useEffect, useMemo, useRef, useState } from "react"

import { refresh } from "@/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BILLING_ENABLED } from "@/config/billing"
import { TierBadge } from "@/features/user-settings/components/tier-badge"
import {
  createCheckoutSession,
  createPortalSession,
  getBillingPublicConfig,
  getBillingSummary,
  type BillingPublicConfig,
  type BillingSummary
} from "@/features/user-settings/api/billing"
import { getAccessToken } from "@/features/signin/auth-storage"
import { decodeJwt, resolveBillingPlan } from "@/lib/decode-jwt"
import { useAppStore } from "@/store"


export function BillingScreen() {
  const userPlan = useAppStore(s => s.userPlan)
  const setUserPlan = useAppStore(s => s.setUserPlan)
  const [busyAction, setBusyAction] = useState<"upgrade" | "manage" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null)
  const [billingPublicConfig, setBillingPublicConfig] = useState<BillingPublicConfig | null>(null)
  const refreshedAfterReturn = useRef(false)

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [])

  useEffect(() => {
    if (!BILLING_ENABLED) return

    void (async () => {
      try {
        const publicConfig = await getBillingPublicConfig()
        setBillingPublicConfig(publicConfig)
        const summary = await getBillingSummary()
        setBillingSummary(summary)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load billing status.")
      }
    })()
  }, [])

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
        const summary = await getBillingSummary()
        setBillingSummary(summary)
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

  const formattedPeriodEnd =
    billingSummary?.current_period_end
      ? new Date(billingSummary.current_period_end).toLocaleDateString()
      : null

  const plusPriceLabel = useMemo(() => {
    const rawAmount = billingPublicConfig?.plus_price?.unit_amount
    const rawCurrency = billingPublicConfig?.plus_price?.currency
    if (typeof rawAmount !== "number" || !rawCurrency) return "€12"
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: rawCurrency.toUpperCase(),
      minimumFractionDigits: rawAmount % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(rawAmount / 100)
  }, [billingPublicConfig])

  const plusIntervalLabel = useMemo(() => {
    const interval = billingPublicConfig?.plus_price?.interval
    if (!interval) return "month"
    return interval
  }, [billingPublicConfig])

  if (!BILLING_ENABLED) return null

  return (
    <div className="absolute inset-0 overflow-y-auto scrollbar-thin bg-background">
      <div className="mx-auto w-full max-w-5xl px-6 py-20 space-y-6">
        <div className="space-y-2">
          <h1 className="text-5xl leading-none">Billing Plans</h1>
          <p className="text-sm text-muted-foreground">
            Pick the plan that matches your workspace needs
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Current subscription</CardTitle>
            <CardDescription>
              Choose your plan and manage your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current plan</span>
            <TierBadge plan={userPlan} />
          </CardContent>

          {billingSummary?.cancel_at_period_end ? (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Subscription is set to cancel at period end
                {formattedPeriodEnd ? ` (${formattedPeriodEnd})` : ""}.
              </p>
            </CardContent>
          ) : null}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl font-informal">Free</CardTitle>
              <CardDescription>Starter usage for personal testing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="text-3xl font-semibold text-foreground">Free</p>
              <p>10 requests / minute</p>
              <p>10 requests / day</p>
              <p>100 requests / month</p>
              <p>1 board maximum</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/60 bg-gradient-to-br from-secondary/20 via-secondary/10 to-card">
            <CardHeader>
              <CardTitle className="text-4xl font-informal">Plus</CardTitle>
              <CardDescription>Higher daily and monthly limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold text-foreground">{plusPriceLabel}</span>
                <span className="text-sm text-muted-foreground">/ {plusIntervalLabel}</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Unlimited requests</p>
                <p>Unlimited boards</p>
              </div>

              {userPlan === "plus" ? (
                <Button
                  variant="outline"
                  onClick={onManage}
                  disabled={busyAction !== null}
                  className="w-full bg-background/30 border-foreground/40"
                >
                  {busyAction === "manage" ? "Opening portal..." : "Manage Subscription"}
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

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  )
}
