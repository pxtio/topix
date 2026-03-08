export type PasswordChecks = {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecial: boolean
}


export type PasswordStrength = {
  score: number
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong"
  checks: PasswordChecks
  isValid: boolean
}


const MIN_PASSWORD_LENGTH = 8


export function getPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordChecks = {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length
  const labels: PasswordStrength["label"][] = ["Very weak", "Weak", "Fair", "Good", "Strong"]

  return {
    score,
    label: labels[Math.max(0, score - 1)],
    checks,
    isValid: score === 5,
  }
}
