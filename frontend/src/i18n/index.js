import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './zh.json'
import en from './en.json'

const STORAGE_KEY = 'ui_language'
const defaultLang = localStorage.getItem(STORAGE_KEY) ?? 'zh'

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: defaultLang,
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang) {
  i18n.changeLanguage(lang)
  localStorage.setItem(STORAGE_KEY, lang)
}

export default i18n
