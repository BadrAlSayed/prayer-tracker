import { useState, type FormEvent } from 'react'
import { useAddPrayerLog, usePrayerOverview, useResetDebt, useSaveDebt } from '../data/prayers'
import {
  DEBT_UNITS,
  PRAYERS,
  addDays,
  debtPhrase,
  formatDay,
  formatRecordedAt,
  journeyDay,
  localDateISO,
  prayerLabel,
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
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 'Enter how long the debt is, as a whole number greater than zero.'
  }
  if (!startedOn || startedOn > today) {
    return 'Choose today or a past day as the day you started.'
  }
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
          <h1 className="text-3xl tracking-tight text-white">Prayer tracker</h1>
        </div>
        <button
          type="button"
          className="mt-1 cursor-pointer text-sm text-slate-400 hover:text-white"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </header>

      {overview.isPending ? <p className="mt-8">Loading your prayers…</p> : null}
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
  const [formError, setFormError] = useState<string | null>(null)
  const today = localDateISO()

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
      <h2 className="text-xl text-white">Set up your prayer debt</h2>
      <p className="mt-2 text-slate-300">
        Add how long you still have to make up, and the day you started making those prayers up.
      </p>

      <label className="mt-6 block text-sm text-slate-400" htmlFor="debt-amount">
        How long is the debt?
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
          aria-label="Debt length unit"
          onChange={(event) => setUnit(event.target.value as DebtUnit)}
        >
          {DEBT_UNITS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.plural}
            </option>
          ))}
        </select>
      </div>

      <label className="mt-6 block text-sm text-slate-400" htmlFor="started-on">
        When did you start?
      </label>
      <input
        id="started-on"
        className={`${fieldClass} mt-2`}
        type="date"
        max={today}
        value={startedOn}
        onChange={(event) => setStartedOn(event.target.value)}
      />

      {formError ? <p className="mt-4 text-red-300">{formError}</p> : null}
      <button className={`${primaryButtonClass} mt-6`} type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save and start'}
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
  const [amount, setAmount] = useState(String(debt.debt_amount))
  const [unit, setUnit] = useState<DebtUnit>(debt.debt_unit)
  const [startedOn, setStartedOn] = useState(debt.started_on)
  const [clearLogs, setClearLogs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
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
      <h2 className="text-lg text-white">Change your debt</h2>
      <p className="mt-1 text-sm text-slate-400">
        Update how long you are making up, and the day you started.
      </p>

      <label className="mt-4 block text-sm text-slate-400" htmlFor="reset-debt-amount">
        How long is the debt?
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
          aria-label="Debt length unit"
          onChange={(event) => setUnit(event.target.value as DebtUnit)}
        >
          {DEBT_UNITS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.plural}
            </option>
          ))}
        </select>
      </div>

      <label className="mt-4 block text-sm text-slate-400" htmlFor="reset-started-on">
        When did you start?
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
        <legend className="text-sm text-slate-400">Prayers recorded so far</legend>
        <label className="mt-2 flex items-start gap-2 text-sm text-slate-200">
          <input
            className="mt-1"
            type="radio"
            name="clear-logs"
            checked={!clearLogs}
            onChange={() => setClearLogs(false)}
          />
          <span>Keep them. Your totals stay as they are.</span>
        </label>
        <label className="mt-2 flex items-start gap-2 text-sm text-slate-200">
          <input
            className="mt-1"
            type="radio"
            name="clear-logs"
            checked={clearLogs}
            onChange={() => setClearLogs(true)}
          />
          <span>Clear them. Your totals go back to zero.</span>
        </label>
      </fieldset>

      {formError ? <p className="mt-4 text-red-300">{formError}</p> : null}
      <div className="mt-4 flex items-center gap-3">
        <button className={primaryButtonClass} type="submit" disabled={saving}>
          {clearLogs ? 'Save and clear prayers' : 'Save changes'}
        </button>
        <button
          type="button"
          className="cursor-pointer text-sm text-slate-400 hover:text-white"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
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
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-debt-title"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl"
      >
        <h2 id="confirm-debt-title" className="text-lg text-white">
          Save these changes?
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          You will be making up {debtPhrase(amount, unit)}, starting {formatDay(startedOn)}.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {clearLogs
            ? 'The prayers recorded so far will be cleared, and your totals will go back to zero.'
            : 'The prayers recorded so far will stay.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="cursor-pointer rounded-full bg-white/10 px-5 py-2.5 text-sm text-white hover:bg-white/15 disabled:cursor-wait disabled:opacity-70"
            onClick={onBack}
            disabled={saving}
            autoFocus
          >
            Go back
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
            {saving ? 'Saving…' : clearLogs ? 'Yes, clear prayers' : 'Yes, save changes'}
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
  const [tab, setTab] = useState<'today' | 'week'>('today')
  const [editingDebt, setEditingDebt] = useState(false)
  const today = localDateISO()
  const dayNumber = journeyDay(debt.started_on, today)
  const todayTotals = totalsForDay(logs, today)

  return (
    <div className="mt-8">
      <p className="text-lg text-white">
        {dayNumber >= 1
          ? `You are on day ${dayNumber} of making up your prayers.`
          : `Your journey starts on ${formatDay(debt.started_on)}.`}
      </p>
      <p className="mt-1 text-slate-400">
        You are making up {debtPhrase(debt.debt_amount, debt.debt_unit)}, starting{' '}
        {formatDay(debt.started_on)}.
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
          Change debt
        </button>
      )}
      <h2 className="mt-6 text-sm text-slate-400">So far</h2>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {PRAYERS.map((prayer) => (
          <li
            key={prayer.id}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center"
          >
            <p className="text-2xl text-white">{totals[prayer.id]}</p>
            <p className="text-xs text-slate-400">{prayer.label}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
        {latest
          ? `Last recorded: ${prayerLabel(latest.prayer)} × ${latest.quantity} on ${formatRecordedAt(latest.created_at)}.`
          : 'You have not recorded a prayer yet.'}
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className={tabButtonClass(tab === 'today')}
          onClick={() => setTab('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={tabButtonClass(tab === 'week')}
          onClick={() => setTab('week')}
        >
          Past week
        </button>
      </div>

      {tab === 'today' ? (
        <ul className="mt-4 flex flex-col gap-3">
          {PRAYERS.map((prayer) => (
            <PrayerRow
              key={prayer.id}
              label={prayer.label}
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
        <p className="text-right text-sm text-slate-400">
          {todayCount} today
          <span className="mt-0.5 block text-white">{overall} total</span>
        </p>
      </div>
      <form className="mt-3 flex items-center gap-3" onSubmit={submit}>
        <input
          className={`${fieldClass} w-20`}
          aria-label={`How many ${label} prayers to add`}
          inputMode="numeric"
          min={1}
          type="number"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <button className={primaryButtonClass} type="submit" disabled={saving}>
          {saving ? 'Adding…' : `Add ${label}`}
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
  const today = localDateISO()
  const days = recentDays(7, today)
  const [prayedOn, setPrayedOn] = useState(addDays(today, -1))
  const [prayer, setPrayer] = useState<PrayerName>('dhuhr')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const earliest = days[days.length - 1]

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseQuantity(quantity)
    if (!parsed) {
      setFormError('Enter a whole number greater than zero.')
      return
    }
    if (prayedOn < earliest || prayedOn > today) {
      setFormError('Choose a day from the past week.')
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
        <h2 className="text-lg text-white">Add a prayer from this week</h2>
        <p className="mt-1 text-sm text-slate-400">
          Use this when you already prayed, and had not written it down yet.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className={fieldClass}
            aria-label="Day the prayer counts for"
            type="date"
            min={earliest}
            max={today}
            value={prayedOn}
            onChange={(event) => setPrayedOn(event.target.value)}
          />
          <select
            className={fieldClass}
            aria-label="Prayer"
            value={prayer}
            onChange={(event) => setPrayer(event.target.value as PrayerName)}
          >
            {PRAYERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            className={`${fieldClass} w-20`}
            aria-label="Quantity"
            inputMode="numeric"
            min={1}
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <button className={primaryButtonClass} type="submit" disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
        {formError ? <p className="mt-3 text-red-300">{formError}</p> : null}
      </form>

      <ul className="mt-4 flex flex-col gap-3">
        {days.map((day) => {
          const totals = totalsForDay(logs, day)
          const recorded = PRAYERS.filter((item) => totals[item.id] > 0)
          return (
            <li key={day} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-white">
                {day === today ? 'Today' : formatDay(day)}
              </h3>
              {recorded.length === 0 ? (
                <p className="mt-1 text-sm text-slate-400">Nothing recorded</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {recorded.map((item) => (
                    <li key={item.id}>
                      {item.label} × {totals[item.id]}
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
