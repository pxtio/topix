import { cn } from "@/lib/utils"
import { getPasswordStrength } from "../lib/password-strength"


type PasswordStrengthMeterProps = {
  password: string
}


export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null

  const strength = getPasswordStrength(password)

  const activeColor =
    strength.score <= 1
      ? "bg-destructive"
      : strength.score <= 3
        ? "bg-amber-500"
        : "bg-emerald-500"

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const active = index < strength.score
          return (
            <div
              key={index}
              className={cn(
                "h-1 w-full rounded-full transition-colors",
                active ? activeColor : "bg-muted"
              )}
            />
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium text-foreground">{strength.label}</span>
      </p>

      <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
        <span className={strength.checks.minLength ? "text-emerald-600 dark:text-emerald-400" : undefined}>
          {strength.checks.minLength ? "✓" : "•"} At least 8 characters
        </span>
        <span className={strength.checks.hasUppercase ? "text-emerald-600 dark:text-emerald-400" : undefined}>
          {strength.checks.hasUppercase ? "✓" : "•"} 1 uppercase letter
        </span>
        <span className={strength.checks.hasLowercase ? "text-emerald-600 dark:text-emerald-400" : undefined}>
          {strength.checks.hasLowercase ? "✓" : "•"} 1 lowercase letter
        </span>
        <span className={strength.checks.hasNumber ? "text-emerald-600 dark:text-emerald-400" : undefined}>
          {strength.checks.hasNumber ? "✓" : "•"} 1 number
        </span>
        <span className={strength.checks.hasSpecial ? "text-emerald-600 dark:text-emerald-400" : undefined}>
          {strength.checks.hasSpecial ? "✓" : "•"} 1 special character
        </span>
      </div>
    </div>
  )
}
