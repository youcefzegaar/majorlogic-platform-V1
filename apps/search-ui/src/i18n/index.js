import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';
import resourcesToBackend from 'i18next-resources-to-backend';

i18n
  .use(ICU)
  .use(initReactI18next)
  .use(resourcesToBackend(
    (language, namespace) => import(`../../public/locales/${language}/${namespace}.json`)
  ))
  .init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'ui',
    supportedLngs: ['en', 'ar', 'fr', 'es', 'pt', 'zh', 'hi'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
