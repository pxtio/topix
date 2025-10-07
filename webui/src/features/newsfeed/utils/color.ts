// --- deterministic mapping: date → tailwind family + shade ---

import { resolveFamilyShade, TAILWIND_HEX, type TailwindShade } from "@/features/board/lib/colors/tailwind"

/**
 * FNV-1a 32-bit hash (fast & stable)
 */
export const fnv1a = (str: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  // always positive uint32
  return (h >>> 0)
}

/**
 * Convert a date string to a deterministic Tailwind color.
 *
 * @param iso - any stringy date (we normalize via new Date(...).toISOString())
 * @param shade - tailwind shade to use (default 100 as requested)
 * @param families - optional allowlist of families to pick from
 *
 * @returns { family, shade, hex }
 */
export const dateToTailwindColor = (
  iso: string,
  shade: TailwindShade = 100,
  families?: string[]
): { family: string, shade: TailwindShade, hex: string } => {
  // normalize input; if invalid, just use epoch
  const norm = (() => {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
  })()

  const pool = families && families.length > 0
    ? families.filter(f => !!TAILWIND_HEX[f])
    : Object.keys(TAILWIND_HEX)

  const idx = fnv1a(norm) % pool.length
  const family = pool[idx]
  const hex = resolveFamilyShade(family, shade) ?? '#f5f5f5'

  return { family, shade, hex }
}
