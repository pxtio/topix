let googleScriptLoading: Promise<void> | null = null


/**
 * Load the Google Identity Services script once for the current page.
 */
export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services requires a browser environment"))
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  if (googleScriptLoading) {
    return googleScriptLoading
  }

  googleScriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"))
    document.head.appendChild(script)
  })

  return googleScriptLoading
}


type RenderGoogleSigninButtonOptions = {
  clientId: string
  element: HTMLElement
  onCredential: (response: google.accounts.id.CredentialResponse) => void
}


/**
 * Initialize Google Identity Services and render the sign-in button.
 */
export async function renderGoogleSigninButton({
  clientId,
  element,
  onCredential,
}: RenderGoogleSigninButtonOptions): Promise<void> {
  await loadGoogleIdentityScript()

  element.replaceChildren()
  google.accounts.id.initialize({
    client_id: clientId,
    callback: onCredential,
  })
  google.accounts.id.renderButton(element, {
    type: "standard",
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with",
    width: element.clientWidth || 360,
  })
}
