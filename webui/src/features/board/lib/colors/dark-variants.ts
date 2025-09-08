// dark-variant.ts
import {
  SHADE_STEPS,
  type Shade,
  findFamilyShadeFromHex,
  resolveFamilyShade,
  toBaseHex,
  isTransparent,
} from "./tailwind"

const INVERTED_SHADE: Record<Shade, Shade> = (() => {
  const arr = [...SHADE_STEPS]
  const map: Partial<Record<number, number>> = {}
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i] as Shade
    const b = arr[arr.length - 1 - i] as Shade
    map[a] = b
  }
  return map as Record<Shade, Shade>
})()

/** HSL lightness inversion as a safe fallback for non-Tailwind hexes. */
const invertLightness = (hex: string): string => {
  const base = toBaseHex(hex)
  if (!base) return hex
  const h = base.slice(1)
  const [r, g, b] = h.length === 3
    ? h.split("").map(c => parseInt(c + c, 16))
    : [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]

  // RGB -> HSL (0..1)
  const rr = r/255, gg = g/255, bb = b/255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  let hdeg = 0, s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2*l - 1))
    switch (max) {
      case rr: hdeg = 60 * (((gg - bb) / d) % 6); break
      case gg: hdeg = 60 * (((bb - rr) / d) + 2); break
      case bb: hdeg = 60 * (((rr - gg) / d) + 4); break
    }
  }
  // invert lightness only
  const l2 = 1 - l

  // HSL -> RGB
  const C = (1 - Math.abs(2*l2 - 1)) * s
  const X = C * (1 - Math.abs(((hdeg/60) % 2) - 1))
  const m = l2 - C/2
  let [r1,g1,b1] = [0,0,0]
  if (0 <= hdeg && hdeg < 60)       [r1,g1,b1] = [C,X,0]
  else if (60 <= hdeg && hdeg <120) [r1,g1,b1] = [X,C,0]
  else if (120<= hdeg && hdeg<180)  [r1,g1,b1] = [0,C,X]
  else if (180<= hdeg && hdeg<240)  [r1,g1,b1] = [0,X,C]
  else if (240<= hdeg && hdeg<300)  [r1,g1,b1] = [X,0,C]
  else                              [r1,g1,b1] = [C,0,X]

  const R = Math.round((r1+m)*255)
  const G = Math.round((g1+m)*255)
  const B = Math.round((b1+m)*255)
  const to2 = (n: number) => n.toString(16).padStart(2,"0")
  return `#${to2(R)}${to2(G)}${to2(B)}`
}

/**
 * Returns the *display* hex to use in dark mode,
 * without changing the stored color value.
 */
export const darkModeDisplayHex = (value?: string | null): string | null => {
  if (isTransparent(value)) return value ?? null

  const base = toBaseHex(value)
  if (!base) return null

  // fixed black/white
  if (base === '#ffffff') return '#000000'
  if (base === '#000000') return '#ffffff'

  // Tailwind family/shade mirror
  const match = findFamilyShadeFromHex(base)
  if (match?.family && match?.shade) {
    const inverted = INVERTED_SHADE[match.shade]
    const hex = resolveFamilyShade(match.family, inverted)
    return hex ?? base
  }

  // Fallback: perceptual invert (keeps hue & saturation)
  return invertLightness(base)
}
