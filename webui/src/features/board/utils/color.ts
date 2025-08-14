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