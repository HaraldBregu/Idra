import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../resources/i18n/en/main.json';
import it from '../../../resources/i18n/it/main.json';
const LANGUAGE_STORAGE_KEY = 'app-language';
function getInitialLanguage() {
    try {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'en' || stored === 'it')
            return stored;
    }
    catch {
        // localStorage may be unavailable in some contexts
    }
    return 'en';
}
i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        it: { translation: it },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});
export default i18n;
