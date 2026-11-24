import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  addDays,
  localDateISO,
  sumByPrayer,
  type DebtUnit,
  type PrayerDebt,
  type PrayerLog,
  type PrayerName,
} from '../lib/prayers'

const pageSize = 1000

export const prayerKeys = {
  all: ['prayers'] as const,
  user: (userId: string) => [...prayerKeys.all, userId] as const,
  overview: (userId: string, today: string) => [...prayerKeys.user(userId), today] as const,
}

export type PrayerOverview = {
  debt: PrayerDebt | null
  logs: PrayerLog[]
  totals: ReturnType<typeof sumByPrayer>
  latest: PrayerLog | null
}

export type SaveDebtInput = {
  amount: number
  unit: DebtUnit
  startedOn: string
}

export type AddPrayerLogInput = {
  prayer: PrayerName
  prayedOn: string
  quantity: number
}

function assertNoError(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message)
}

async function fetchPrayerLogs(userId: string) {
  const rows: PrayerLog[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('prayer_logs')
      .select('id, user_id, prayer, prayed_on, quantity, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    assertNoError(error)
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }

  return rows
}

export async function fetchPrayerOverview(
  userId: string,
  today = localDateISO(),
): Promise<PrayerOverview> {
  const weekStart = addDays(today, -6)
  const [debtResult, logs] = await Promise.all([
    supabase
      .from('prayer_debts')
      .select('id, user_id, debt_amount, debt_unit, started_on')
      .eq('user_id', userId)
      .maybeSingle(),
    fetchPrayerLogs(userId),
  ])

  assertNoError(debtResult.error)

  return {
    debt: debtResult.data,
    logs: logs.filter((log) => log.prayed_on >= weekStart),
    totals: sumByPrayer(logs),
    latest: logs[0] ?? null,
  }
}

export async function insertPrayerDebt(userId: string, input: SaveDebtInput) {
  const { error } = await supabase.from('prayer_debts').insert({
    user_id: userId,
    debt_amount: input.amount,
    debt_unit: input.unit,
    started_on: input.startedOn,
  })
  assertNoError(error)
}

export async function insertPrayerLog(userId: string, input: AddPrayerLogInput) {
  const { error } = await supabase.from('prayer_logs').insert({
    user_id: userId,
    prayer: input.prayer,
    prayed_on: input.prayedOn,
    quantity: input.quantity,
  })
  assertNoError(error)
}

export function usePrayerOverview(userId: string) {
  const today = localDateISO()
  return useQuery({
    queryKey: prayerKeys.overview(userId, today),
    queryFn: () => fetchPrayerOverview(userId, today),
  })
}

async function refreshPrayers(queryClient: QueryClient, userId: string) {
  await queryClient.invalidateQueries({ queryKey: prayerKeys.user(userId) })
}

export function useSaveDebt(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveDebtInput) => insertPrayerDebt(userId, input),
    onSuccess: () => refreshPrayers(queryClient, userId),
  })
}

export function useAddPrayerLog(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddPrayerLogInput) => insertPrayerLog(userId, input),
    onSuccess: () => refreshPrayers(queryClient, userId),
  })
}
