import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAddPrayerLog, usePrayerOverview, useResetDebt, useSaveDebt } from '../data/prayers'
import { LanguageToggle } from './LanguageToggle'
import { dateLocale } from '../i18n'
import {
  DEBT_UNITS,
  PRAYERS,
  addDays,
  formatDay,
  formatRecordedAt,
  journeyDay,
  localDateISO,
  recentDays,
  totalsForDay,
  type DebtUnit,
  type PrayerDebt,
  type PrayerLog,
  type PrayerName,
} from '../lib/prayers'

const fieldClass =
  'rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500'
const primaryButtonClass =
  'cursor-pointer rounded-full bg-emerald-600 px-5 py-2.5 font-[inherit] text-white disabled:cursor-wait disabled:opacity-70'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : null
}

function parseQuantity(value: string) {
  const quantity = Number(value)
  if (!Number.isInteger(quantity) || quantity < 1) return null
  return quantity
}

function parseDebtForm(amount: string, startedOn: string, today: string) {
  const parsed = Number(amount)
  if (!Number.isInteger(parsed) || parsed < 1) return 'invalidAmount' as const
  if (!startedOn || startedOn > today) return 'invalidStart' as const
  return { amount: parsed, startedOn }
}

export function Home({
  userId,
  name,
  onSignOut,
}: {
  userId: string
  name: string
  onSignOut: () => void
}) {
  const { t } = useTranslation()
  const overview = usePrayerOverview(userId)
  const saveDebtMutation = useSaveDebt(userId)
  const resetDebtMutation = useResetDebt(userId)
  const addLogMutation = useAddPrayerLog(userId)
  const data = overview.data
  const error =
    errorMessage(overview.error) ??
    errorMessage(saveDebtMutation.error) ??
    errorMessage(resetDebtMutation.error) ??
    errorMessage(addLogMutation.error)

  async function saveDebt(amount: number, unit: DebtUnit, startedOn: string) {
    try {
      await saveDebtMutation.mutateAsync({ amount, unit, startedOn })
      return true
    } catch {
      return false
    }
  }

  async function resetDebt(
    amount: number,
    unit: DebtUnit,
    startedOn: string,
    clearLogs: boolean,
  ) {
    try {
      await resetDebtMutation.mutateAsync({ amount, unit, startedOn, clearLogs })
      return true
    } catch {
      return false
    }
  }

  async function addLog(prayer: PrayerName, prayedOn: string, quantity: number) {
    try {
      await addLogMutation.mutateAsync({ prayer, prayedOn, quantity })
      return true
    } catch {
      return false
    }
  }

  return (
    <div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{name}</p>
          <h1 className="text-3xl tracking-tight text-white">{t('appName')}</h1>
        </div>
        <div className="mt-1 flex items-center gap-4">
          <LanguageToggle />
          <button
            type="button"
            className="cursor-pointer text-sm text-slate-400 hover:text-white"
            onClick={onSignOut}
          >
            {t('auth.signOut')}
          </button>
        </div>
      </header>

      {overview.isPending ? <p className="mt-8">{t('home.loading')}</p> : null}
      {data && !data.debt ? <DebtSetup onSave={saveDebt} /> : null}
      {data?.debt ? (
        <Tracker
          debt={data.debt}
          logs={data.logs}
          totals={data.totals}
          latest={data.latest}
          onAdd={addLog}
          onReset={resetDebt}
        />
      ) : null}
      {error ? <p className="mt-4 text-red-300">{error}</p> : null}
    </div>
  )
}

function DebtSetup({
  onSave,
}: {
  onSave: (amount: number, unit: DebtUnit, startedOn: string) => Promise<boolean>
}) {
  const [amount, setAmount] = useState('1')
  const [unit, setUnit] = useState<DebtUnit>('year')
  const [startedOn, setStartedOn] = useState(localDateISO())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<'invalidAmount' | 'invalidStart' | null>(null)
  const today = localDateISO()
  const { t } = useTranslation()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseDebtForm(amount, startedOn, today)
    if (typeof parsed === 'string') {
      setFormError(parsed)
      return
    }
    setFormError(null)
    setSaving(true)
    await onSave(parsed.amount, unit, parsed.startedOn)
    setSaving(false)
  }

  return (
    <form className="mt-8" onSubmit={submit}>
      <h2 className="text-xl text-white">{t('setup.title')}</h2>
      <p className="mt-2 text-slate-300">{t('setup.intro')}</p>

      <label className="mt-6 block text-sm text-slate-400" htmlFor="debt-amount">
        {t('setup.length')}
      </label>
      <div className="mt-2 flex gap-3">
        <input
          id="debt-amount"
          className={`${fieldClass} w-24`}
          inputMode="numeric"
          min={1}
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <select
          className={fieldClass}
          value={unit}
          aria-label={t('setup.unit')}
          onChange={(event) => setUnit(event.target.value as DebtUnit)}
        >
          {DEBT_UNITS.map((item) => (
            <option key={item.id} value={item.id}>
              {t(`units.${item.id}`)}
            </option>
          ))}
        </select>
      </div>

      <label className="mt-6 block text-sm text-slate-400" htmlFor="started-on">
        {t('setup.started')}
      </label>
      <input
        id="started-on"
        className={`${fieldClass} mt-2`}
        type="date"
        max={today}
        value={startedOn}
        onChange={(event) => setStartedOn(event.target.value)}
      />

      {formError ? <p className="mt-4 text-red-300">{t(`errors.${formError}`)}</p> : null}
      <button className={`${primaryButtonClass} mt-6`} type="submit" disabled={saving}>
        {saving ? t('setup.saving') : t('setup.save')}
      </button>
    </form>
  )
}

function ChangeDebt({
  debt,
  onSave,
  onCancel,
}: {
  debt: PrayerDebt
  onSave: (
    amount: number,
    unit: DebtUnit,
    startedOn: string,
    clearLogs: boolean,
  ) => Promise<boolean>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState(String(debt.debt_amount))
  const [unit, setUnit] = useState<DebtUnit>(debt.debt_unit)
  const [startedOn, setStartedOn] = useState(debt.started_on)
  const [clearLogs, setClearLogs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<'invalidAmount' | 'invalidStart' | null>(null)
  const [pending, setPending] = useState<{
    amount: number
    unit: DebtUnit
    startedOn: string
    clearLogs: boolean
  } | null>(null)
  const today = localDateISO()

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseDebtForm(amount, startedOn, today)
    if (typeof parsed === 'string') {
      setFormError(parsed)
      return
    }
    setFormError(null)
    setPending({
      amount: parsed.amount,
      unit,
      startedOn: parsed.startedOn,
      clearLogs,
    })
  }

  async function confirmSave() {
    if (!pending) return
    setSaving(true)
    const saved = await onSave(pending.amount, pending.unit, pending.startedOn, pending.clearLogs)
    setSaving(false)
    if (!saved) setPending(null)
  }

  return (
    <form className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4" onSubmit={submit}>
      <h2 className="text-lg text-white">{t('change.title')}</h2>
      <p className="mt-1 text-sm text-slate-400">{t('change.intro')}</p>

      <label className="mt-4 block text-sm text-slate-400" htmlFor="reset-debt-amount">
        {t('setup.length')}
      </label>
      <div className="mt-2 flex gap-3">
        <input
          id="reset-debt-amount"
          className={`${fieldClass} w-24`}
          inputMode="numeric"
          min={1}
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <select
          className={fieldClass}
          value={unit}
          aria-label={t('setup.unit')}
          onChange={(event) => setUnit(event.target.value as DebtUnit)}
        >
          {DEBT_UNITS.map((item) => (
            <option key={item.id} value={item.id}>
              {t(`units.${item.id}`)}
            </option>
          ))}
        </select>
      </div>

      <label className="mt-4 block text-sm text-slate-400" htmlFor="reset-started-on">
        {t('setup.started')}
      </label>
      <input
        id="reset-started-on"
        className={`${fieldClass} mt-2`}
        type="date"
        max={today}
        value={startedOn}
        onChange={(event) => setStartedOn(event.target.value)}
      />

      <fieldset className="mt-4">
        <legend className="text-sm text-slate-400">{t('change.recorded')}</legend>
        <label className="mt-2 flex items-start gap-2 text-sm text-slate-200">
          <input
            className="mt-1"
            type="radio"
            name="clear-logs"
            checked={!clearLogs}
            onChange={() => setClearLogs(false)}
          />
          <span>{t('change.keep')}</span>
        </label>
        <label className="mt-2 flex items-start gap-2 text-sm text-slate-200">
          <input
            className="mt-1"
            type="radio"
            name="clear-logs"
            checked={clearLogs}
            onChange={() => setClearLogs(true)}
          />
          <span>{t('change.clear')}</span>
        </label>
      </fieldset>

      {formError ? <p className="mt-4 text-red-300">{t(`errors.${formError}`)}</p> : null}
      <div className="mt-4 flex items-center gap-3">
        <button className={primaryButtonClass} type="submit" disabled={saving}>
          {clearLogs ? t('change.saveClear') : t('change.save')}
        </button>
        <button
          type="button"
          className="cursor-pointer text-sm text-slate-400 hover:text-white"
          onClick={onCancel}
          disabled={saving}
        >
          {t('change.cancel')}
        </button>
      </div>
      {pending ? (
        <ConfirmDebtChange
          amount={pending.amount}
          unit={pending.unit}
          startedOn={pending.startedOn}
          clearLogs={pending.clearLogs}
          saving={saving}
          onConfirm={confirmSave}
          onBack={() => {
            if (!saving) setPending(null)
          }}
        />
      ) : null}
    </form>
  )
}

function ConfirmDebtChange({
  amount,
  unit,
  startedOn,
  clearLogs,
  saving,
  onConfirm,
  onBack,
}: {
  amount: number
  unit: DebtUnit
  startedOn: string
  clearLogs: boolean
  saving: boolean
  onConfirm: () => void
  onBack: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-debt-title"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl"
      >
        <h2 id="confirm-debt-title" className="text-lg text-white">
          {t('change.confirmTitle')}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {t('change.confirmDebt', {
            debt: t(`units.${unit}`, { count: amount }),
            day: formatDay(startedOn, locale),
          })}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {clearLogs ? t('change.confirmClear') : t('change.confirmKeep')}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="cursor-pointer rounded-full bg-white/10 px-5 py-2.5 text-sm text-white hover:bg-white/15 disabled:cursor-wait disabled:opacity-70"
            onClick={onBack}
            disabled={saving}
            autoFocus
          >
            {t('change.back')}
          </button>
          <button
            type="button"
            className={
              clearLogs
                ? 'cursor-pointer rounded-full bg-red-600 px-5 py-2.5 text-sm text-white disabled:cursor-wait disabled:opacity-70'
                : primaryButtonClass
            }
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? t('setup.saving') : clearLogs ? t('change.yesClear') : t('change.yesSave')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Tracker({
  debt,
  logs,
  totals,
  latest,
  onAdd,
  onReset,
}: {
  debt: PrayerDebt
  logs: PrayerLog[]
  totals: Record<PrayerName, number>
  latest: PrayerLog | null
  onAdd: (prayer: PrayerName, prayedOn: string, quantity: number) => Promise<boolean>
  onReset: (
    amount: number,
    unit: DebtUnit,
    startedOn: string,
    clearLogs: boolean,
  ) => Promise<boolean>
}) {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<'today' | 'week'>('today')
  const [editingDebt, setEditingDebt] = useState(false)
  const today = localDateISO()
  const locale = dateLocale(i18n.language)
  const dayNumber = journeyDay(debt.started_on, today)
  const todayTotals = totalsForDay(logs, today)
  const startedLabel = formatDay(debt.started_on, locale)

  return (
    <div className="mt-8">
      <p className="text-lg text-white">
        {dayNumber >= 1
          ? t('tracker.onDay', { count: dayNumber })
          : t('tracker.startsOn', { day: startedLabel })}
      </p>
      <p className="mt-1 text-slate-400">
        {t('tracker.makingUp', {
          debt: t(`units.${debt.debt_unit}`, { count: debt.debt_amount }),
          day: startedLabel,
        })}
      </p>
      {editingDebt ? (
        <ChangeDebt
          debt={debt}
          onCancel={() => setEditingDebt(false)}
          onSave={async (amount, unit, startedOn, clearLogs) => {
            const saved = await onReset(amount, unit, startedOn, clearLogs)
            if (saved) setEditingDebt(false)
            return saved
          }}
        />
      ) : (
        <button
          type="button"
          className="mt-3 cursor-pointer text-sm text-emerald-400 hover:text-emerald-300"
          onClick={() => setEditingDebt(true)}
        >
          {t('change.action')}
        </button>
      )}
      <h2 className="mt-6 text-sm text-slate-400">{t('tracker.soFar')}</h2>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {PRAYERS.map((prayer) => (
          <li
            key={prayer.id}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center"
          >
            <p className="text-2xl text-white">{totals[prayer.id]}</p>
            <p className="text-xs text-slate-400">{t(`prayers.${prayer.id}`)}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
        {latest
          ? t('tracker.last', {
              prayer: t(`prayers.${latest.prayer}`),
              quantity: latest.quantity,
              when: formatRecordedAt(latest.created_at, locale),
            })
          : t('tracker.empty')}
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className={tabButtonClass(tab === 'today')}
          onClick={() => setTab('today')}
        >
          {t('tabs.today')}
        </button>
        <button
          type="button"
          className={tabButtonClass(tab === 'week')}
          onClick={() => setTab('week')}
        >
          {t('tabs.week')}
        </button>
      </div>

      {tab === 'today' ? (
        <ul className="mt-4 flex flex-col gap-3">
          {PRAYERS.map((prayer) => (
            <PrayerRow
              key={prayer.id}
              label={t(`prayers.${prayer.id}`)}
              todayCount={todayTotals[prayer.id]}
              overall={totals[prayer.id]}
              onAdd={(quantity) => onAdd(prayer.id, today, quantity)}
            />
          ))}
        </ul>
      ) : (
        <PastWeek logs={logs} onAdd={onAdd} />
      )}
    </div>
  )
}

function tabButtonClass(active: boolean) {
  return active
    ? 'cursor-pointer rounded-full bg-white px-4 py-2 text-sm text-slate-950'
    : 'cursor-pointer rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300'
}

function PrayerRow({
  label,
  todayCount,
  overall,
  onAdd,
}: {
  label: string
  todayCount: number
  overall: number
  onAdd: (quantity: number) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseQuantity(quantity)
    if (!parsed) return
    setSaving(true)
    const saved = await onAdd(parsed)
    if (saved) setQuantity('1')
    setSaving(false)
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg text-white">{label}</h2>
        <p className="text-end text-sm text-slate-400">
          {t('tracker.todayCount', { count: todayCount })}
          <span className="mt-0.5 block text-white">
            {t('tracker.totalCount', { count: overall })}
          </span>
        </p>
      </div>
      <form className="mt-3 flex items-center gap-3" onSubmit={submit}>
        <input
          className={`${fieldClass} w-20`}
          aria-label={t('tracker.quantityLabel', { prayer: label })}
          inputMode="numeric"
          min={1}
          type="number"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <button className={primaryButtonClass} type="submit" disabled={saving}>
          {saving ? t('tracker.adding') : t('tracker.addPrayer', { prayer: label })}
        </button>
      </form>
    </li>
  )
}

function PastWeek({
  logs,
  onAdd,
}: {
  logs: PrayerLog[]
  onAdd: (prayer: PrayerName, prayedOn: string, quantity: number) => Promise<boolean>
}) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const today = localDateISO()
  const days = recentDays(7, today)
  const [prayedOn, setPrayedOn] = useState(addDays(today, -1))
  const [prayer, setPrayer] = useState<PrayerName>('dhuhr')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<'invalidQuantity' | 'invalidWeekDay' | null>(null)
  const earliest = days[days.length - 1]

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseQuantity(quantity)
    if (!parsed) {
      setFormError('invalidQuantity')
      return
    }
    if (prayedOn < earliest || prayedOn > today) {
      setFormError('invalidWeekDay')
      return
    }
    setFormError(null)
    setSaving(true)
    const saved = await onAdd(prayer, prayedOn, parsed)
    if (saved) setQuantity('1')
    setSaving(false)
  }

  return (
    <div className="mt-4">
      <form className="rounded-2xl border border-white/10 bg-white/5 p-4" onSubmit={submit}>
        <h2 className="text-lg text-white">{t('week.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('week.intro')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className={fieldClass}
            aria-label={t('week.day')}
            type="date"
            min={earliest}
            max={today}
            value={prayedOn}
            onChange={(event) => setPrayedOn(event.target.value)}
          />
          <select
            className={fieldClass}
            aria-label={t('week.prayer')}
            value={prayer}
            onChange={(event) => setPrayer(event.target.value as PrayerName)}
          >
            {PRAYERS.map((item) => (
              <option key={item.id} value={item.id}>
                {t(`prayers.${item.id}`)}
              </option>
            ))}
          </select>
          <input
            className={`${fieldClass} w-20`}
            aria-label={t('week.quantity')}
            inputMode="numeric"
            min={1}
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <button className={primaryButtonClass} type="submit" disabled={saving}>
            {saving ? t('tracker.adding') : t('week.add')}
          </button>
        </div>
        {formError ? <p className="mt-3 text-red-300">{t(`errors.${formError}`)}</p> : null}
      </form>

      <ul className="mt-4 flex flex-col gap-3">
        {days.map((day) => {
          const totals = totalsForDay(logs, day)
          const recorded = PRAYERS.filter((item) => totals[item.id] > 0)
          return (
            <li key={day} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-white">
                {day === today ? t('tabs.today') : formatDay(day, locale)}
              </h3>
              {recorded.length === 0 ? (
                <p className="mt-1 text-sm text-slate-400">{t('week.nothing')}</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {recorded.map((item) => (
                    <li key={item.id}>
                      {t(`prayers.${item.id}`)} × {totals[item.id]}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
