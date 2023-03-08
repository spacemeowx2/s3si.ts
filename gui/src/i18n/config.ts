import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import translation from './translation/en.json';
import HttpBackend from 'i18next-http-backend'

export const resources = {
  en: {
    translation,
  }
};

const instance = i18next
  .use(initReactI18next)
  .use(LanguageDetector);

if (import.meta.env.DEV) {
  instance.use(HttpBackend);
}

instance.init({
  debug: import.meta.env.DEV,
  resources,
  saveMissing: true,
  fallbackLng: 'en'
});
