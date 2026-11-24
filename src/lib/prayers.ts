export const PRAYERS = [
  { id: 'fajr' },
  { id: 'dhuhr' },
  { id: 'asr' },
  { id: 'maghrib' },
  { id: 'isha' },
] as const

export const DEBT_UNITS = [{ id: 'day' }, { id: 'month' }, { id: 'year' }] as const

export type PrayerName = (typeof PRAYERS)[number]['id']
export type DebtUnit = (typeof DEBT_UNITS)[number]['id']

export type PrayerDebt = {
  id: string
  user_id: string
  debt_amount: number
  debt_unit: DebtUnit
  started_on: string
}

export type PrayerLog = {
  id: string
  user_id: string
  prayer: PrayerName
  prayed_on: string
  quantity: number
  created_at: string
}

export function localDateISO(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return localDateISO(date)
}

export function recentDays(count = 7, today = localDateISO()) {
  return Array.from({ length: count }, (_, index) => addDays(today, -index))
}

export function journeyDay(startedOn: string, today = localDateISO()) {
  const start = new Date(`${startedOn}T00:00:00`).getTime()
  const current = new Date(`${today}T00:00:00`).getTime()
  return Math.floor((current - start) / 86_400_000) + 1
}

export function formatDay(isoDate: string, locale = 'en') {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function formatRecordedAt(isoTimestamp: string, locale = 'en') {
  return new Date(isoTimestamp).toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function emptyTotals() {
  return Object.fromEntries(PRAYERS.map((prayer) => [prayer.id, 0])) as Record<PrayerName, number>
}

export function sumByPrayer(rows: { prayer: PrayerName; quantity: number }[]) {
  const totals = emptyTotals()
  for (const row of rows) totals[row.prayer] += row.quantity
  return totals
}

export function totalsForDay(logs: PrayerLog[], day: string) {
  return sumByPrayer(logs.filter((log) => log.prayed_on === day))
}
