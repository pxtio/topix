// --- Color utils ---

// Usage: cssVarToHex('var(--color-blue-500)') -> '#3b82f6'
export function cssVarToHex(input: string, el: HTMLElement = document.documentElement): string | null {
  if (!input) return null
  let value = input.trim()

  if (value.startsWith('var(')) {
    const inside = value.slice(4, -1).trim()
    const prop = inside.split(',')[0].trim()
    const resolved = getComputedStyle(el).getPropertyValue(prop).trim()
    if (!resolved) return null
    value = resolved
  }

  const normalizeHex = (hex: string) => {
    let h = hex.replace('#','').trim()
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('')
    if (h.length === 6 || h.length === 8) return '#' + h.toLowerCase()
    return null
  }

  if (value.startsWith('#')) {
    const hx = normalizeHex(value)
    if (hx) return hx
  }

  const rgbToHex = (r: number, g: number, b: number, a?: number) => {
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
    const to2 = (n: number) => clamp(n).toString(16).padStart(2, '0')
    const base = '#' + to2(r) + to2(g) + to2(b)
    if (a == null || a >= 1) return base
    const aa = Math.max(0, Math.min(255, Math.round(a * 255)))
    return base + aa.toString(16).padStart(2, '0')
  }

  const hslToRgb = (h: number, s: number, l: number) => {
    const C = (1 - Math.abs(2 * l - 1)) * s
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - C / 2
    let r = 0, g = 0, b = 0
    if (0 <= h && h < 60) { r = C; g = X; b = 0 }
    else if (60 <= h && h < 120) { r = X; g = C; b = 0 }
    else if (120 <= h && h < 180) { r = 0; g = C; b = X }
    else if (180 <= h && h < 240) { r = 0; g = X; b = C }
    else if (240 <= h && h < 300) { r = X; g = 0; b = C }
    else { r = C; g = 0; b = X }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
  }

  const splitParts = (s: string) => s
    .replace('(', ' ').replace(')', ' ')
    .split(',').join(' ')
    .split('/').join(' ')
    .split(' ').filter(Boolean)

  if (value.startsWith('rgb')) {
    const p = splitParts(value).slice(1)
    const r = parseFloat(p[0])
    const g = parseFloat(p[1])
    const b = parseFloat(p[2])
    const a = p[3] != null ? parseFloat(p[3]) : undefined
    return rgbToHex(r, g, b, a)
  }

  if (value.startsWith('hsl')) {
    const p = splitParts(value).slice(1)
    const h = parseFloat(p[0])
    const s = parseFloat(p[1]) / 100
    const l = parseFloat(p[2]) / 100
    const a = p[3] != null ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : undefined
    const { r, g, b } = hslToRgb(((h % 360) + 360) % 360, s, l)
    return rgbToHex(r, g, b, a)
  }

  // Tailwind CSS var often stores bare HSL components like "210 100% 56%" (no hsl())
  if (value.includes('%') && value.split(' ').length >= 3) {
    const parts = value.split(' ').filter(Boolean)
    const h = parseFloat(parts[0])
    const s = parseFloat(parts[1]) / 100
    const l = parseFloat(parts[2]) / 100
    const a = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : undefined
    if (!isNaN(h) && !isNaN(s) && !isNaN(l)) {
      const { r, g, b } = hslToRgb(((h % 360) + 360) % 360, s, l)
      return rgbToHex(r, g, b, a)
    }
  }

  if (value === 'transparent') return '#00000000'
  return null
}


export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

export function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/**
 * Strong, nuanced hue gradient.
 * - `mode: 'light' | 'dark'` tunes alphas/ratios for multiply vs screen blending.
 * - Defaults to 'light' to remain backward-compatible with your current call site.
 */
export function buildSubtleHueGradient(hex: string, mode: 'light' | 'dark' = 'light') {
  let h = 215, s = 60, l = 70
  try {
    const { r, g, b } = hexToRgb(hex)
    const hsl = rgbToHsl(r, g, b)
    h = hsl.h
    s = hsl.s
    l = hsl.l
  } catch { /* noop */ }

  // local variants
  const sHi = clamp(s * 1.06)
  const lHiLight = clamp(l * 1.16)   // highlight lift (light mode)
  const lHiDark  = clamp(l * 1.08)   // gentler in dark (screen pops more)
  const sMid = clamp(s * 0.94)
  const lMid = clamp(l * 0.94)
  const lLo  = clamp(l - 14)

  if (mode === 'dark') {
    // DARK — screen blend:
    // - smaller/softer bottom-left glow (avoid overshoot)
    // - slightly stronger counter layer top-right to prevent "transparent" feel
    // - overall lower alphas to keep chroma from looking neon
    const radialBL = `radial-gradient(900px 560px at 10% 96%,
      hsla(${h} ${sHi}% ${lHiDark}% / 0.20) 0%,
      hsla(${h} ${s}%   ${l}%      / 0.10) 40%,
      transparent 68%)`

    const radialTR = `radial-gradient(1000px 680px at 100% 0%,
      hsla(${h} ${sMid}% ${lLo}% / 0.24) 0%,
      transparent 62%)`

    const linearSweep = `linear-gradient(to top right,
      hsla(${h} ${s}%   ${clamp(l + 4)}% / 0.10) 0%,
      hsla(${h} ${sMid}% ${lMid}%        / 0.08) 48%,
      hsla(${h} ${s}%   ${lLo}%          / 0.16) 100%)`

    return `${radialTR}, ${radialBL}, ${linearSweep}`
  }

  // LIGHT — multiply blend (richer, wider transition)
  const radialBL = `radial-gradient(1200px 800px at 8% 100%,
    hsla(${h} ${sHi}% ${lHiLight}% / 0.34) 0%,
    hsla(${h} ${s}%   ${l}%        / 0.20) 45%,
    transparent 70%)`

  const radialTR = `radial-gradient(900px 600px at 100% 0%,
    hsla(${h} ${sMid}% ${lLo}% / 0.18),
    transparent 60%)`

  const linearSweep = `linear-gradient(to top right,
    hsla(${h} ${s}%   ${clamp(l + 6)}% / 0.18) 0%,
    hsla(${h} ${sMid}% ${lMid}%       / 0.12) 45%,
    hsla(${h} ${s}%   ${lLo}%         / 0.22) 100%)`

  return `${radialTR}, ${radialBL}, ${linearSweep}`
}

/* ---------- fade mask helper (no background painting) ---------- */
export function buildFadeMaskStyle(stops: { solidUntil?: number } = {}) {
  const solid = stops.solidUntil ?? 75
  const mask = `linear-gradient(to bottom, rgba(0,0,0,1) ${solid}%, rgba(0,0,0,0) 100%)`
  return {
    WebkitMaskImage: mask,
    maskImage: mask
  } as React.CSSProperties
}