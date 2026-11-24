import { useTranslation } from 'react-i18next'

export function AppTitle({ className = '' }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <h1 className={`text-4xl leading-none font-semibold ${className}`}>
      <span className="bg-gradient-to-br from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]">
        {t('appName')}
      </span>
    </h1>
  )
}
