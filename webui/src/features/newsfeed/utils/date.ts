export function formatNewsletterDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const month = MONTHS_SHORT[d.getMonth()]
  const day = d.getDate()
  const year = d.getFullYear()
  return `${month} ${ordinal(day)}, ${year}`
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec']

export function ordinal(n: number) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}