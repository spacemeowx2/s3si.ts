import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './translation/en.json';
import zhCN from './translation/zh-CN.json';
import ja from './translation/ja.json';
import HttpBackend from 'i18next-http-backend'

export const resources = {
  en: {
    translation: en,
  },
  'zh-CN': {
    translation: zhCN,
  },
  ja: {
    translation: ja,
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
  fallbackLng: 'en',
  // saveMissing: true,
});
