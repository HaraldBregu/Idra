import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Languages, PanelTop, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { SettingsPageHeader, SettingsPageShell, SettingsSection } from '../../components';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts';
const LANGUAGE_OPTIONS = [
    { value: 'en', labelKey: 'settings.language.en' },
    { value: 'it', labelKey: 'settings.language.it' },
];
const GeneralPage = () => {
    const { t } = useTranslation();
    const { language, setLanguage } = useApp();
    const [trayEnabled, setTrayEnabled] = useState(true);
    useEffect(() => {
        void window.app.getTrayEnabled().then(setTrayEnabled);
    }, []);
    const handleTrayToggle = useCallback((checked) => {
        setTrayEnabled(checked);
        void window.app.setTrayEnabled(checked);
    }, []);
    const handleOpenAppDataFolder = useCallback(() => {
        void window.app.openAppDataFolder();
    }, []);
    const handleLanguageChange = (next) => {
        if (next === null)
            return;
        const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
        if (option)
            setLanguage(option.value);
    };
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.tabs.general') }), _jsx(SettingsSection, { title: t('settings.application.information'), children: _jsxs(Card, { size: "sm", className: "gap-0! p-0!", children: [_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.application.name') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx("span", { className: "text-[13px] text-foreground", children: __APP_NAME__ }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.application.version') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx("span", { className: "font-mono text-[13px] text-foreground", children: __APP_VERSION__ }) })] })] }) }), _jsx(SettingsSection, { title: t('settings.application.actions'), children: _jsxs(Card, { size: "sm", className: "gap-0! p-0!", children: [_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(PanelTop, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.application.menuBar') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Switch, { checked: trayEnabled, onCheckedChange: handleTrayToggle, "aria-label": t('settings.application.menuBar') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(FolderOpen, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.application.appData') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Button, { variant: "outline", size: "xs", onClick: handleOpenAppDataFolder, children: t('settings.application.openAppData') }) })] })] }) }), _jsx(SettingsSection, { title: t('settings.sections.layout'), children: _jsx(Card, { size: "sm", className: "gap-0! p-0!", children: _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Languages, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.language.title') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsxs(Select, { value: language, onValueChange: handleLanguageChange, children: [_jsx(SelectTrigger, { size: "sm", className: "w-36 text-xs [&_svg]:size-3", "aria-label": t('settings.language.title'), children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: LANGUAGE_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: t(option.labelKey) }, option.value))) })] }) })] }) }) })] }));
};
export default GeneralPage;
