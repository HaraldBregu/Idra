import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from 'react';
import i18n from '../i18n';
const LANGUAGE_STORAGE_KEY = 'app-language';
function readPersistedLanguage() {
    try {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'en' || stored === 'it')
            return stored;
    }
    catch {
        /* empty */
    }
    return 'en';
}
const AppContext = createContext(undefined);
export function AppProvider({ children, initialState }) {
    const [language, setLanguageState] = useState(initialState?.language ?? readPersistedLanguage());
    const setLanguage = useCallback((next) => setLanguageState(next), []);
    const resetState = useCallback(() => {
        setLanguageState(readPersistedLanguage());
    }, []);
    useEffect(() => {
        i18n.changeLanguage(language);
        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        }
        catch {
            /* empty */
        }
    }, [language]);
    const value = useMemo(() => ({ language, setLanguage, resetState }), [language, setLanguage, resetState]);
    return _jsx(AppContext.Provider, { value: value, children: children });
}
export function useApp() {
    const ctx = useContext(AppContext);
    if (ctx === undefined)
        throw new Error('useApp must be used within an AppProvider');
    return ctx;
}
