import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Crown03Icon } from "@hugeicons/core-free-icons"

import { refresh } from "@/api"
import { Badge } from "@/components/ui/badge"
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

  const subscriptionStatus = useMemo(() => {
    if (billingSummary?.cancel_at_period_end) {
      return formattedPeriodEnd
        ? `Cancels on ${formattedPeriodEnd}`
        : "Cancels at period end"
    }
    return "Active"
  }, [billingSummary, formattedPeriodEnd])

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
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-bold">Current Plan</span>
              <TierBadge plan={userPlan} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-bold">Status</span>
              <Badge
                variant="outline"
                className={[
                  "font-mono font-medium uppercase tracking-wide",
                  billingSummary?.cancel_at_period_end
                    ? "border-destructive/60 bg-destructive/10 text-destructive"
                    : "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                ].join(" ")}
              >
                {subscriptionStatus}
              </Badge>
            </div>
          </CardContent>

          {billingSummary?.cancel_at_period_end ? (
            <CardContent className="pt-0">
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    Access remains active until {formattedPeriodEnd ?? "the end of this period"}.
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={onManage}
                disabled={busyAction !== null}
                className="mt-3"
              >
                {busyAction === "manage" ? "Opening portal..." : "Resume Membership"}
              </Button>
            </CardContent>
          ) : null}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-4xl font-informal">Free</CardTitle>
                {userPlan === "free" ? (
                  <Badge variant="outline" className="w-fit bg-background/40 font-mono font-medium uppercase tracking-wide">
                    Current
                  </Badge>
                ) : null}
              </div>
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

          <Card className="relative border-secondary/60 bg-gradient-to-br from-secondary/20 via-secondary/10 to-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Crown03Icon} className="h-6 w-6 text-secondary" />
                <CardTitle className="text-4xl font-informal">Plus</CardTitle>
                {userPlan === "plus" ? (
                  <Badge variant="outline" className="w-fit bg-background/40 font-mono font-medium uppercase tracking-wide">
                    Current
                  </Badge>
                ) : null}
              </div>
              <CardDescription>Unlimited limits</CardDescription>
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
                  className="w-full bg-background/30 border-foreground/60"
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
