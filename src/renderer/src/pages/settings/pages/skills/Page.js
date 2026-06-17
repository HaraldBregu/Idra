import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, RefreshCw, Sparkles, Upload, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { SettingsEmptyState, SettingsLoadingRows, SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsSection, } from '../../components';
function getErrorMessage(error, fallback) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return fallback;
}
const SkillsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [skillsRoot, setSkillsRoot] = useState('');
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const loadSkills = useCallback(async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const [list, root] = await Promise.all([window.skills.list(), window.skills.getRoot()]);
            setSkills(list);
            setSkillsRoot(root);
        }
        catch (error) {
            setErrorMessage(getErrorMessage(error, t('settings.skills.loadError')));
        }
        finally {
            setLoading(false);
        }
    }, [t]);
    useEffect(() => {
        void loadSkills();
    }, [loadSkills]);
    const handleImport = useCallback(async () => {
        setImporting(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const result = await window.skills.importSkill();
            if (result) {
                const importedCount = result.imported.length;
                const skippedCount = result.skipped.length;
                setSuccessMessage(t('settings.skills.uploaded', {
                    count: String(importedCount),
                    skipped: String(skippedCount),
                }));
                await loadSkills();
            }
        }
        catch (error) {
            setErrorMessage(getErrorMessage(error, t('settings.skills.uploadError')));
        }
        finally {
            setImporting(false);
        }
    }, [loadSkills, t]);
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.tabs.skills'), description: t('settings.skills.description'), action: _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "xs", onClick: loadSkills, disabled: loading || importing, children: [_jsx(RefreshCw, { className: "size-3" }), t('settings.skills.refresh')] }), _jsxs(Button, { size: "xs", onClick: () => void handleImport(), disabled: loading || importing, children: [_jsx(Upload, { className: "size-3" }), importing ? t('settings.skills.uploading') : t('settings.skills.upload')] })] }) }), errorMessage && (_jsx(SettingsNotice, { variant: "destructive", icon: AlertTriangle, children: errorMessage })), successMessage && (_jsx(SettingsNotice, { children: successMessage })), _jsx(SettingsSection, { title: t('settings.skills.title'), description: skillsRoot || undefined, children: _jsx(SettingsPanel, { children: loading ? (_jsx(SettingsLoadingRows, { rows: 2 })) : skills.length === 0 ? (_jsx(SettingsEmptyState, { icon: Sparkles, title: t('settings.skills.empty'), description: t('settings.skills.emptyDescription') })) : (skills.map((skill) => (_jsxs(Item, { role: "button", tabIndex: 0, variant: "outline", size: "md", className: "cursor-pointer border-b border-border/60 hover:bg-muted/40 last:border-b-0", onClick: () => navigate(`/settings/skills/skilldetails/${encodeURIComponent(skill.id)}`), onKeyDown: (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                navigate(`/settings/skills/skilldetails/${encodeURIComponent(skill.id)}`);
                            }
                        }, children: [_jsxs(ItemContent, { className: "min-w-0 flex-1 flex-col items-start gap-1", children: [_jsx(ItemTitle, { className: "max-w-full truncate", children: skill.manifest.name }), _jsx("p", { className: "line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground", children: skill.manifest.description || t('settings.skills.noDescription') })] }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(ChevronRight, { className: "size-3.5 text-muted-foreground transition-transform group-hover/item:translate-x-0.5", strokeWidth: 1.8 }) })] }, skill.id)))) }) })] }));
};
export default SkillsPage;
