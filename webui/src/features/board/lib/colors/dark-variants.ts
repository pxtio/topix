// dark-variant.ts
import {
  SHADE_STEPS,
  TAILWIND_HEX,
  resolveFamilyShade,
  toBaseHex,
  isTransparent,
} from "./tailwind"


const DARK_BG_ANCHOR = "#262d3a"


const DARK_SIDEBAR_ANCHOR = "#232938"


const SOURCE_TO_TARGET_SHADE: Record<number, number> = {
  50: 800,
  100: 800,
  200: 700,
  300: 600,
  400: 600,
  500: 500,
  600: 400,
  700: 300,
  800: 200,
  900: 100,
  950: 100,
}


const SHADE_ANCHOR_BLEND: Record<number, number> = {
  50: 0.24,
  100: 0.22,
  200: 0.2,
  300: 0.17,
  400: 0.14,
  500: 0.11,
  600: 0.1,
  700: 0.08,
  800: 0.06,
  900: 0.05,
  950: 0.05,
}


const SOURCE_TO_DARKER_SHADE: Record<number, number> = {
  50: 200,
  100: 300,
  200: 400,
  300: 500,
  400: 600,
  500: 700,
  600: 800,
  700: 900,
  800: 950,
  900: 950,
  950: 950,
}


const SOURCE_TO_LIGHTER_SHADE: Record<number, number> = {
  50: 50,
  100: 50,
  200: 100,
  300: 200,
  400: 300,
  500: 400,
  600: 500,
  700: 600,
  800: 700,
  900: 800,
  950: 900,
}


const toRgb = (hex: string) => {
  const h = hex.slice(1)
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6)
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}


const rgbToHex = (r: number, g: number, b: number) => {
  const to2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
  return `#${to2(r)}${to2(g)}${to2(b)}`
}


const mixHex = (a: string, b: string, t: number) => {
  const A = toRgb(a)
  const B = toRgb(b)
  const p = Math.max(0, Math.min(1, t))
  return rgbToHex(
    A.r * (1 - p) + B.r * p,
    A.g * (1 - p) + B.g * p,
    A.b * (1 - p) + B.b * p
  )
}


const buildTailwindShadeMap = (
  shadeTransform: Record<number, number>,
  blendAmount = 0,
  blendTarget?: string
) => {
  const map = new Map<string, string>()
  for (const [family, shades] of Object.entries(TAILWIND_HEX)) {
    for (const sourceShade of SHADE_STEPS) {
      const sourceHex = toBaseHex(shades[sourceShade])
      if (!sourceHex) continue

      const targetShade = shadeTransform[sourceShade]
      const targetHex = resolveFamilyShade(family, targetShade)
      if (!targetHex) continue

      if (blendTarget && blendAmount > 0) {
        map.set(sourceHex, mixHex(targetHex, blendTarget, blendAmount))
      } else {
        map.set(sourceHex, targetHex)
      }
    }
  }
  return map
}


const fallbackInvertLightness = (hex: string): string => {
  const base = toBaseHex(hex)
  if (!base) return hex
  const h = base.slice(1)
  const [r, g, b] = h.length === 3
    ? h.split("").map(c => parseInt(c + c, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]

  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  let hdeg = 0
  let s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case rr: hdeg = 60 * (((gg - bb) / d) % 6); break
      case gg: hdeg = 60 * (((bb - rr) / d) + 2); break
      case bb: hdeg = 60 * (((rr - gg) / d) + 4); break
    }
  }
  const l2 = 1 - l
  const C = (1 - Math.abs(2 * l2 - 1)) * s
  const X = C * (1 - Math.abs(((hdeg / 60) % 2) - 1))
  const m = l2 - C / 2
  let [r1, g1, b1] = [0, 0, 0]
  if (0 <= hdeg && hdeg < 60) [r1, g1, b1] = [C, X, 0]
  else if (60 <= hdeg && hdeg < 120) [r1, g1, b1] = [X, C, 0]
  else if (120 <= hdeg && hdeg < 180) [r1, g1, b1] = [0, C, X]
  else if (180 <= hdeg && hdeg < 240) [r1, g1, b1] = [0, X, C]
  else if (240 <= hdeg && hdeg < 300) [r1, g1, b1] = [X, 0, C]
  else [r1, g1, b1] = [C, 0, X]

  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255)
}


const DARK_LAYER_ANCHOR = mixHex(DARK_BG_ANCHOR, DARK_SIDEBAR_ANCHOR, 0.5)


const TAILWIND_DARK_DISPLAY_HEX = (() => {
  const map = new Map<string, string>()
  for (const [family, shades] of Object.entries(TAILWIND_HEX)) {
    for (const sourceShade of SHADE_STEPS) {
      const sourceHex = toBaseHex(shades[sourceShade])
      if (!sourceHex) continue

      const targetShade = SOURCE_TO_TARGET_SHADE[sourceShade]
      const targetHex = resolveFamilyShade(family, targetShade)
      if (!targetHex) continue

      const blendT = SHADE_ANCHOR_BLEND[sourceShade] ?? 0.12
      map.set(sourceHex, mixHex(targetHex, DARK_LAYER_ANCHOR, blendT))
    }
  }
  return map
})()


const TAILWIND_DARKER_HEX = buildTailwindShadeMap(SOURCE_TO_DARKER_SHADE, 0.08, "#000000")


const TAILWIND_LIGHTER_HEX = buildTailwindShadeMap(SOURCE_TO_LIGHTER_SHADE, 0.08, "#ffffff")


const FALLBACK_CACHE = new Map<string, string>()


const FALLBACK_DARKER_CACHE = new Map<string, string>()


const FALLBACK_LIGHTER_CACHE = new Map<string, string>()


const fallbackToneDown = (hex: string) => mixHex(hex, "#000000", 0.2)


const fallbackToneUp = (hex: string) => mixHex(hex, "#ffffff", 0.2)


/**
 * Returns the display hex used for node rendering in dark mode.
 *
 * - Tailwind palette colors hit a precomputed, anchor-tuned mapping.
 * - Custom colors use a cached fallback transform.
 * - Stored node colors are never mutated.
 */
export const darkModeDisplayHex = (value?: string | null): string | null => {
  if (isTransparent(value)) return value ?? null

  const base = toBaseHex(value)
  if (!base) return null

  if (base === "#ffffff") return "#000000"
  if (base === "#000000") return "#ffffff"

  const mapped = TAILWIND_DARK_DISPLAY_HEX.get(base)
  if (mapped) return mapped

  const cached = FALLBACK_CACHE.get(base)
  if (cached) return cached

  const fallback = fallbackInvertLightness(base)
  FALLBACK_CACHE.set(base, fallback)
  return fallback
}


/**
 * Returns a darker display variant for layered/back surfaces.
 *
 * - Tailwind colors use a precomputed map.
 * - Custom colors fall back to a cached darken mix.
 */
export const darkerDisplayHex = (value?: string | null): string | null => {
  if (isTransparent(value)) return value ?? null

  const base = toBaseHex(value)
  if (!base) return null

  const mapped = TAILWIND_DARKER_HEX.get(base)
  if (mapped) return mapped

  const cached = FALLBACK_DARKER_CACHE.get(base)
  if (cached) return cached

  const next = fallbackToneDown(base)
  FALLBACK_DARKER_CACHE.set(base, next)
  return next
}


/**
 * Returns a lighter display variant for foreground/top surfaces.
 *
 * - Tailwind colors use a precomputed map.
 * - Custom colors fall back to a cached lighten mix.
 */
export const lighterDisplayHex = (value?: string | null): string | null => {
  if (isTransparent(value)) return value ?? null

  const base = toBaseHex(value)
  if (!base) return null

  const mapped = TAILWIND_LIGHTER_HEX.get(base)
  if (mapped) return mapped

  const cached = FALLBACK_LIGHTER_CACHE.get(base)
  if (cached) return cached

  const next = fallbackToneUp(base)
  FALLBACK_LIGHTER_CACHE.set(base, next)
  return next
}
