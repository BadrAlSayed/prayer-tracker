import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const next = i18n.language.startsWith('ar') ? 'en' : 'ar'

  return (
    <button
      type="button"
      className="cursor-pointer text-sm text-slate-400 hover:text-white"
      aria-label={t('language.label')}
      onClick={() => i18n.changeLanguage(next)}
    >
      {t('language.switch')}
    </button>
  )
}
