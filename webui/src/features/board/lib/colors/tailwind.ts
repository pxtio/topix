import { cssVarToHex } from "../../utils/color"

export const TAILWIND_HEX: Record<string, Record<number, string>> = {
  slate: { 50:"#f8fafc",100:"#f1f5f9",200:"#e2e8f0",300:"#cbd5e1",400:"#94a3b8",500:"#64748b",600:"#475569",700:"#334155",800:"#1e293b",900:"#0f172a",950:"#020617" },
  neutral:{ 50:"#fafafa",100:"#f5f5f5",200:"#e5e5e5",300:"#d4d4d4",400:"#a3a3a3",500:"#737373",600:"#525252",700:"#404040",800:"#262626",900:"#171717",950:"#0a0a0a" },
  stone:  { 50:"#fafaf9",100:"#f5f5f4",200:"#e7e5e4",300:"#d6d3d1",400:"#a8a29e",500:"#78716c",600:"#57534e",700:"#44403c",800:"#292524",900:"#1c1917",950:"#0c0a09" },
  rose:   { 50:"#fff1f2",100:"#ffe4e6",200:"#fecdd3",300:"#fda4af",400:"#fb7185",500:"#f43f5e",600:"#e11d48",700:"#be123c",800:"#9f1239",900:"#881337",950:"#4c0519" },
  teal:   { 50:"#f0fdfa",100:"#ccfbf1",200:"#99f6e4",300:"#5eead4",400:"#2dd4bf",500:"#14b8a6",600:"#0d9488",700:"#0f766e",800:"#115e59",900:"#134e4a",950:"#042f2e" },
  blue:   { 50:"#eff6ff",100:"#dbeafe",200:"#bfdbfe",300:"#93c5fd",400:"#60a5fa",500:"#3b82f6",600:"#2563eb",700:"#1d4ed8",800:"#1e40af",900:"#1e3a8a",950:"#172554" },
  violet: { 50:"#f5f3ff",100:"#ede9fe",200:"#ddd6fe",300:"#c4b5fd",400:"#a78bfa",500:"#8b5cf6",600:"#7c3aed",700:"#6d28d9",800:"#5b21b6",900:"#4c1d95",950:"#2e1065" },
  fuchsia:{ 50:"#fdf4ff",100:"#fae8ff",200:"#f5d0fe",300:"#f0abfc",400:"#e879f9",500:"#d946ef",600:"#c026d3",700:"#a21caf",800:"#86198f",900:"#701a75",950:"#4a044e" },
  pink:   { 50:"#fdf2f8",100:"#fce7f3",200:"#fbcfe8",300:"#f9a8d4",400:"#f472b6",500:"#ec4899",600:"#db2777",700:"#be185d",800:"#9d174d",900:"#831843",950:"#500724" },
  green:  { 50:"#f0fdf4",100:"#dcfce7",200:"#bbf7d0",300:"#86efac",400:"#4ade80",500:"#22c55e",600:"#16a34a",700:"#15803d",800:"#166534",900:"#14532d",950:"#052e16" },
  cyan:   { 50:"#ecfeff",100:"#cffafe",200:"#a5f3fc",300:"#67e8f9",400:"#22d3ee",500:"#06b6d4",600:"#0891b2",700:"#0e7490",800:"#155e75",900:"#164e63",950:"#083344" },
  orange: { 50:"#fff7ed",100:"#ffedd5",200:"#fed7aa",300:"#fdba74",400:"#fb923c",500:"#f97316",600:"#ea580c",700:"#c2410c",800:"#9a3412",900:"#7c2d12",950:"#431407" },
  amber:  { 50:"#fffbeb",100:"#fef3c7",200:"#fde68a",300:"#fcd34d",400:"#fbbf24",500:"#f59e0b",600:"#d97706",700:"#b45309",800:"#92400e",900:"#78350f",950:"#451a03" },
  red:    { 50:"#fef2f2",100:"#fee2e2",200:"#fecaca",300:"#fca5a5",400:"#f87171",500:"#ef4444",600:"#dc2626",700:"#b91c1c",800:"#991b1b",900:"#7f1d1d",950:"#450a0a" },
}

export const TailwindShades = [50,100,200,300,400,500,600,700,800,900,950] as const

export type TailwindShade = typeof TailwindShades[number]

/**
 * Build a palette for a given Tailwind shade across all supported families
 *
 * @param shade - Tailwind shade value (e.g., 200, 500)
 * @returns Array of { name, hex } objects for families that define this shade
 */
export const buildPalette = (shade: TailwindShade) =>
  Object.entries(TAILWIND_HEX).flatMap(([name, shades]) => {
    const hex = shades[shade]
    return hex ? [{ name, hex }] : []
  })

export const TAILWIND_200 = buildPalette(200)

/**
 * Resolve a hex value given a Tailwind family and shade
 *
 * @param family - Tailwind family name (e.g., 'blue', 'neutral')
 * @param shade - Shade number to resolve
 * @returns Hex string (e.g., '#3b82f6') or null if not found
 */
export const resolveFamilyShade = (family: string, shade: number) =>
  TAILWIND_HEX[family]?.[shade] ?? null

export const SHADE_STEPS = [50,100,200,300,400,500,600,700,800,900,950] as const
export type Shade = typeof SHADE_STEPS[number]

export type Family = {
  id: string
  key?: string
  family?: string
  transparent?: boolean
  fixedHex?: string
}

export const FAMILIES: Family[] = [
  { id: 'transparent', key: 'q', transparent: true },
  { id: 'white', key: 'w', fixedHex: '#ffffff' },
  { id: 'black', key: 'e', fixedHex: '#000000' },
  { id: 'slate', key: 'r', family: 'slate' },
  { id: 'neutral', key: 't', family: 'neutral' },
  { id: 'stone', key: 'y', family: 'stone' },
  { id: 'rose', key: 'u', family: 'rose' },
  { id: 'teal', key: 'a', family: 'teal' },
  { id: 'blue', key: 's', family: 'blue' },
  { id: 'violet', key: 'd', family: 'violet' },
  { id: 'fuchsia', key: 'f', family: 'fuchsia' },
  { id: 'pink', key: 'g', family: 'pink' },
  { id: 'green', key: 'z', family: 'green' },
  { id: 'cyan', key: 'x', family: 'cyan' },
  { id: 'orange', key: 'c', family: 'orange' },
  { id: 'amber', key: 'v', family: 'amber' },
  { id: 'red', key: 'b', family: 'red' },
]

/* helpers */

/**
 * Normalize any CSS color or hex-like string to a 7-char base hex (#rrggbb)
 *
 * - Supports CSS custom properties by resolving with cssVarToHex
 * - Accepts 3- or 6-digit hex and truncates longer values to 6 digits
 *
 * @param c - CSS color string or hex
 * @returns Normalized '#rrggbb' or null if input is invalid
 */
export const toBaseHex = (c?: string | null) => {
  if (!c) return null
  const hex = cssVarToHex(c) ?? c
  if (!hex || !hex.startsWith('#')) return null
  const h = hex.slice(1).toLowerCase()
  const base = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6)
  return '#' + base
}


/**
 * Compare two color strings for equality by normalizing to base hex
 *
 * @param a - First color string
 * @param b - Second color string
 * @returns true if both normalize to the same '#rrggbb', otherwise false
 */
export const isSameColor = (a?: string | null, b?: string | null) => {
  const A = toBaseHex(a)
  const B = toBaseHex(b)
  return !!A && !!B && A === B
}


/**
 * Determine whether a value should be treated as transparent
 *
 * - null/undefined values are considered transparent
 * - If a CSS variable resolves to '#00000000' (8-digit hex with 0 alpha), it is transparent
 *
 * @param v - CSS color string or variable
 * @returns true if transparent-like, otherwise false
 */
export const isTransparent = (v?: string | null) => {
  if (v == null) return true
  const hx = cssVarToHex(v)
  return hx === '#00000000'
}


/**
 * Find the Tailwind family and shade that exactly matches a given hex
 *
 * @param hex - Color to match (any hex-like value, 3- or 6-digit, with '#')
 * @returns { family, shade } if an exact match exists, otherwise null
 */
export const findFamilyShadeFromHex = (hex: string | null): { family?: string, shade?: Shade } | null => {
  const base = toBaseHex(hex)
  if (!base) return null
  for (const fam of Object.keys(TAILWIND_HEX)) {
    for (const s of SHADE_STEPS) {
      if (toBaseHex(TAILWIND_HEX[fam][s]) === base) {
        return { family: fam, shade: s }
      }
    }
  }
  return null
}


/**
 * Compute relative luminance (WCAG) for a given hex color
 *
 * Formula per WCAG 2.1 using sRGB → linear conversion
 *
 * @param hex - Hex color string ('#rgb' or '#rrggbb')
 * @returns Relative luminance in [0, 1]
 */
export const getLuminance = (hex: string): number => {
  const clean = hex.replace('#','')
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map(c=>c+c).join('')
    : clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  const srgb = [r,g,b].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4)
  })
  return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2]
}


/**
 * Pick a random Tailwind color for a given shade
 *
 * @param shade - The Tailwind shade to pick from (e.g., 200, 500)
 * @param families - Optional whitelist of family names to restrict the random pick (e.g., ['blue','violet'])
 * @returns An object { family, hex } for the chosen color, or null if none available
 *
 * @example
 * const c = pickRandomColorOfShade(500)         // random among all families at 500
 * const d = pickRandomColorOfShade(300, ['blue','teal']) // random among blue/teal at 300
 */
export const pickRandomColorOfShade = (
  shade: TailwindShade,
  families?: string[]
): { family: string, hex: string } | null => {
  const palette = buildPalette(shade)
  const filtered = families && families.length > 0
    ? palette.filter(p => families.includes(p.name))
    : palette
  if (filtered.length === 0) return null
  const idx = Math.floor(Math.random() * filtered.length)
  const choice = filtered[idx]
  return { family: choice.name, hex: choice.hex }
}