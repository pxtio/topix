import { API_URL } from "@/config/api"
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from "./features/signin/auth-storage"

let isRedirecting = false

function isAuthPage() {
  const p = location.pathname
  return p === "/signin" || p === "/signup"
}

function isBrowserAsset(reqUrl: string) {
  try {
    const u = new URL(reqUrl, location.origin)
    return u.pathname === "/favicon.ico"
  } catch {
    return false
  }
}

let logoutHandler: (() => void) | null = null
export function registerLogoutHandler(cb: () => void) {
  logoutHandler = cb
}

/**
 * HTTP methods supported by the API.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"


/**
 * Options for the apiFetch function.
 */
export type ApiOptions<TBody = unknown> = {
  path: string | URL
  method?: HttpMethod
  params?: Record<string, string | number | boolean | null | undefined>
  headers?: HeadersInit
  body?: TBody extends FormData ? FormData : TBody
  signal?: AbortSignal
  noAuth?: boolean
}


/**
 * The payload returned by the authentication endpoints.
 */
export type TokenPayload = {
  access_token: string
  token_type: string
  refresh_token?: string | null
}


/* ---------------------------
   Single-flight refresh logic
---------------------------- */
let refreshing: Promise<void> | null = null


/**
 * Refresh the access token using the stored refresh token.
 */
async function refreshAccessToken(): Promise<void> {
  if (refreshing) return refreshing

  refreshing = (async () => {
    const rt = getRefreshToken()
    if (!rt) throw new Error("No refresh token")

    const url = new URL("/users/refresh", API_URL)
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    })

    if (!res.ok) throw new Error("Refresh failed")

    const json: unknown = await res.json()
    // backend: { data: { token: {...} } } because of with_standard_response
    const token = (json as { data?: { token?: TokenPayload }; token?: TokenPayload }).data?.token
      ?? (json as { token?: TokenPayload }).token

    if (!token?.access_token) throw new Error("Bad refresh payload")

    setAccessToken(token.access_token)
    if (token.refresh_token) setRefreshToken(token.refresh_token)
  })()

  try {
    await refreshing
  } finally {
    refreshing = null
  }
}


/* ---------------------------
   Core request wrapper
---------------------------- */

/**
 * A wrapper around fetch() that handles:
 * - Building the full URL from API_URL + path
 * - Adding query parameters
 * - Adding Authorization header with access token
 * - Refreshing the access token on 401 responses and retrying once
 * - JSON request and response handling
 */
export async function apiFetch<TResponse = unknown, TBody = unknown>(
  opts: ApiOptions<TBody>
): Promise<TResponse> {
  const { method = "GET", headers, body, params, signal, noAuth } = opts

  // Build absolute URL from API_URL + path
  const url = new URL(
    typeof opts.path === "string" ? opts.path : opts.path.toString(),
    API_URL
  )

  if (params) {
    const sp = new URLSearchParams(url.search)
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) sp.set(k, String(v))
    })
    url.search = sp.toString()
  }

  const h = new Headers(headers)

  if (!noAuth) {
    const token = getAccessToken()
    if (token) h.set("Authorization", `Bearer ${token}`)
  }

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined && body !== null) {
    h.set("Content-Type", "application/json")
    payload = JSON.stringify(body)
  }

  // First attempt
  let res = await fetch(url.toString(), { method, headers: h, body: payload, signal })

  // If unauthorized and we are allowed to refresh -> refresh then retry once
  if (res.status === 401 && !noAuth) {
    try {
      await refreshAccessToken()

      const newHeaders = new Headers(h)
      const newToken = getAccessToken()
      if (newToken) newHeaders.set("Authorization", `Bearer ${newToken}`)

      res = await fetch(url.toString(), {
        method,
        headers: newHeaders,
        body: payload,
        signal,
      })
    } catch {
      clearTokens()
      // If it's a favicon or we're on an auth page, do NOT bounce again
      if (isAuthPage() || isBrowserAsset(url.toString())) {
        throw new Error("Unauthorized")
      }

      // Prefer SPA logout handler if registered
      if (logoutHandler && !isRedirecting) {
        isRedirecting = true
        logoutHandler()
        return await new Promise<never>(() => {}) // stop here
      }

      if (!isRedirecting) {
        isRedirecting = true
        window.location.replace("/signin")
      }
      throw new Error("Unauthorized")
    }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText} - ${text}`)
  }

  const ct = res.headers.get("content-type") || ""
  return ct.includes("application/json")
    ? ((await res.json()) as TResponse)
    : ((await res.text()) as unknown as TResponse)
}

/* ---------------------------
   Auth helpers (typed)
---------------------------- */

/**
 * Sign in a user and store the returned tokens.
 */
export async function signin(username: string, password: string): Promise<TokenPayload> {
  const url = new URL("/users/signin", API_URL)
  const form = new URLSearchParams()
  form.set("username", username)
  form.set("password", password)

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Signin failed: ${text}`)
  }

  const json: unknown = await res.json()
  const token = (json as { data?: { token?: TokenPayload }; token?: TokenPayload }).data?.token
    ?? (json as { token?: TokenPayload }).token

  if (!token?.access_token) throw new Error("Wrong password or username.")

  setAccessToken(token.access_token)
  if (token.refresh_token) setRefreshToken(token.refresh_token)

  return token
}


/**
 * Sign up a new user and store the returned tokens.
 */
export async function signup(body: {
  email: string
  password: string
  name: string
  username: string
}): Promise<TokenPayload> {
  const tokenWrap = await apiFetch<{ data: { token: TokenPayload } }>({
    path: "/users/signup",
    method: "POST",
    body,
    noAuth: true,
  })

  const token = tokenWrap?.data?.token
  if (!token?.access_token) throw new Error("Bad signup payload")

  setAccessToken(token.access_token)
  if (token.refresh_token) setRefreshToken(token.refresh_token)

  return token
}


/**
 * Refresh the access token using the stored refresh token.
 */
export async function refresh(): Promise<TokenPayload> {
  await refreshAccessToken()
  return {
    access_token: getAccessToken() ?? "",
    token_type: "bearer",
    refresh_token: getRefreshToken(),
  }
}


export type RawInit = RequestInit & { noAuth?: boolean }

/**
 * Fetch that:
 *  - attaches Bearer from localStorage
 *  - if 401 (and not noAuth), calls refresh() once
 *  - retries the original request
 *  - returns the Response without reading it (safe for streaming)
 */
export async function fetchWithAuthRaw(input: string | URL, init: RawInit = {}): Promise<Response> {
  const { noAuth, headers, ...rest } = init

  const h = new Headers(headers)
  if (!noAuth) {
    const token = getAccessToken()
    if (token) h.set("Authorization", `Bearer ${token}`)
  }

  const doFetch = (hdrs: Headers) =>
    fetch(typeof input === "string" ? input : input.toString(), { ...rest, headers: hdrs })

  // first attempt
  let res = await doFetch(h)

  if (res.status === 401 && !noAuth) {
    try {
      await refresh() // will set new access token (and maybe refresh token)
      const h2 = new Headers(h)
      const t2 = getAccessToken()
      if (t2) h2.set("Authorization", `Bearer ${t2}`)
      res = await doFetch(h2)
    } catch {
      clearTokens()

      // If it's a favicon or we're on an auth page, do NOT bounce again
      if (isAuthPage()) {
        throw new Error("Unauthorized")
      }

      // Prefer SPA logout handler if registered
      if (logoutHandler && !isRedirecting) {
        isRedirecting = true
        logoutHandler()
        return await new Promise<never>(() => {}) // stop here
      }

      if (!isRedirecting) {
        isRedirecting = true
        window.location.replace("/signin")
      }
      throw new Error("Unauthorized")
    }
  }

  return res
}