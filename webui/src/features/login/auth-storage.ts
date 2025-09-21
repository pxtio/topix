let accessToken: string | null = null

export function setAccessToken(token: string) {
  accessToken = token
  localStorage.setItem("access_token", token)
}

export function getAccessToken(): string | null {
  return accessToken ?? localStorage.getItem("access_token")
}

export function setRefreshToken(token: string) {
  localStorage.setItem("refresh_token", token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token")
}

export function clearTokens() {
  accessToken = null
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
}