import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import translation from './translation/en.json';

export const resources = {
  en: {
    translation,
  }
};

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    debug: import.meta.env.DEV,
    resources,
  });
