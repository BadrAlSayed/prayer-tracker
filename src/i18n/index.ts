import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './ar'
import en from './en'

const STORAGE_KEY = 'prayer-debt-locale'

function initialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'ar' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

function syncDocument(language: string) {
  const arabic = language.startsWith('ar')
  document.documentElement.lang = arabic ? 'ar' : 'en'
  document.documentElement.dir = arabic ? 'rtl' : 'ltr'
  document.title = i18n.t('appName')
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

i18n.on('languageChanged', (language) => {
  localStorage.setItem(STORAGE_KEY, language.startsWith('ar') ? 'ar' : 'en')
  syncDocument(language)
})

syncDocument(i18n.language)

export function dateLocale(language: string) {
  return language.startsWith('ar') ? 'ar-EG-u-nu-latn' : 'en'
}

export default i18n
