import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Download, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { SettingsEmptyState, SettingsLoadingRows, SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsSection, } from '../../../components';
function getErrorMessage(error, fallback) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return fallback;
}
function compactList(values, emptyLabel) {
    return values && values.length > 0 ? values.join(', ') : emptyLabel;
}
function metadataFlag(skill, key) {
    const value = skill.manifest.metadata?.[key];
    return typeof value === 'boolean' ? value : undefined;
}
function skillVersion(skill) {
    return skill.manifest.version?.trim() || '0.1.0';
}
const SkillDetailsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { skillId } = useParams();
    const decodedSkillId = decodeURIComponent(skillId ?? '');
    const [skill, setSkill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const loadErrorFallback = t('settings.skills.loadError');
    const loadSkill = useCallback(async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const list = await window.skills.list();
            setSkill(list.find((item) => item.id === decodedSkillId) ?? null);
        }
        catch (error) {
            setErrorMessage(getErrorMessage(error, loadErrorFallback));
            setSkill(null);
        }
        finally {
            setLoading(false);
        }
    }, [decodedSkillId, loadErrorFallback]);
    useEffect(() => {
        void loadSkill();
    }, [loadSkill]);
    const handleDownload = useCallback(async () => {
        if (!skill)
            return;
        setDownloading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const downloaded = await window.skills.downloadSkill(skill.id);
            if (downloaded) {
                setSuccessMessage(t('settings.skills.downloaded', {
                    name: skill.manifest.name,
                    path: downloaded.destinationPath,
                }));
            }
        }
        catch (error) {
            setErrorMessage(getErrorMessage(error, t('settings.skills.downloadError')));
        }
        finally {
            setDownloading(false);
        }
    }, [skill, t]);
    const handleDelete = useCallback(async () => {
        if (!skill)
            return;
        const message = t('settings.skills.confirmDelete', { name: skill.manifest.name });
        if (!window.confirm(message))
            return;
        setDeleting(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            await window.skills.delete(skill.id);
            navigate('/settings/skills');
        }
        catch (error) {
            setErrorMessage(getErrorMessage(error, t('settings.skills.deleteError')));
        }
        finally {
            setDeleting(false);
        }
    }, [navigate, skill, t]);
    if (loading) {
        return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.skills.details') }), _jsx(SettingsPanel, { children: _jsx(SettingsLoadingRows, { rows: 3 }) })] }));
    }
    if (!skill) {
        return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.skills.details') }), errorMessage && (_jsx(SettingsNotice, { variant: "destructive", icon: AlertTriangle, children: errorMessage })), _jsx(SettingsPanel, { children: _jsx(SettingsEmptyState, { icon: Sparkles, title: decodedSkillId || t('settings.skills.empty'), description: t('settings.skills.emptyDescription'), className: "min-h-28" }) })] }));
    }
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: skill.manifest.name, description: skill.manifest.description || t('settings.skills.noDescription'), action: _jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsxs(Button, { variant: "outline", size: "xs", onClick: () => void handleDownload(), disabled: downloading || deleting, children: [_jsx(Download, { className: "size-3" }), downloading ? t('settings.skills.downloading') : t('settings.skills.download')] }), _jsxs(Button, { variant: "destructive", size: "xs", onClick: () => void handleDelete(), disabled: downloading || deleting, children: [_jsx(Trash2, { className: "size-3" }), t('settings.skills.delete')] })] }) }), errorMessage && (_jsx(SettingsNotice, { variant: "destructive", icon: AlertTriangle, children: errorMessage })), successMessage && (_jsx(SettingsNotice, { children: successMessage })), _jsx(SettingsSection, { title: t('settings.skills.details'), children: _jsxs(SettingsPanel, { children: [_jsx(SkillDetail, { label: t('settings.skills.detailId'), value: skill.id, mono: true }), _jsx(SkillDetail, { label: t('settings.skills.detailFormat'), value: skill.structure?.standard || t('settings.skills.none') }), _jsx(SkillDetail, { label: t('settings.skills.detailVersion'), value: skillVersion(skill) }), _jsx(SkillDetail, { label: t('settings.skills.detailCategory'), value: skill.manifest.category || t('settings.skills.none') }), _jsx(SkillDetail, { label: t('settings.skills.detailSafety'), value: skill.manifest.safetyLevel || t('settings.skills.none') }), _jsx(SkillDetail, { label: t('settings.skills.detailVisibility'), value: skill.manifest.visibility || t('settings.skills.none') }), _jsx(SkillDetail, { label: t('settings.skills.detailAuthor'), value: skill.manifest.author || t('settings.skills.none') }), _jsx(SkillDetail, { label: t('settings.skills.detailTools'), value: compactList([
                                ...(skill.manifest.requiredTools ?? []),
                                ...(skill.manifest.allowedTools ?? []),
                            ], t('settings.skills.none')) }), _jsx(SkillDetail, { label: t('settings.skills.detailConnectors'), value: compactList(skill.manifest.requiredConnectors, t('settings.skills.none')) }), _jsx(SkillDetail, { label: t('settings.skills.detailTags'), value: compactList(skill.manifest.tags, t('settings.skills.none')) }), _jsx(SkillDetail, { label: t('settings.skills.detailModel'), value: metadataFlag(skill, 'disableModelInvocation') === true
                                ? t('settings.skills.modelHidden')
                                : t('settings.skills.modelVisible') }), _jsx(SkillDetail, { label: t('settings.skills.detailFolder'), value: skill.folderPath, mono: true }), _jsx(SkillDetail, { label: t('settings.skills.detailSkillFile'), value: skill.skillPath || t('settings.skills.none'), mono: true })] }) }), skill.diagnostics && skill.diagnostics.length > 0 && (_jsx(SettingsSection, { title: t('settings.skills.detailDiagnostics'), children: _jsx(SettingsPanel, { children: skill.diagnostics.map((diagnostic) => (_jsx(Item, { variant: "outline", size: "md", className: "border-b border-border/60 last:border-b-0", children: _jsxs(ItemContent, { className: "min-w-0 flex-col items-start gap-1", children: [_jsx(ItemTitle, { className: "max-w-full truncate", children: diagnostic.code }), _jsx("p", { className: "text-[11px] leading-4 text-muted-foreground", children: diagnostic.message })] }) }, `${diagnostic.code}:${diagnostic.message}`))) }) }))] }));
};
function SkillDetail({ label, value, mono, }) {
    return (_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60 last:border-b-0", children: [_jsx(ItemContent, { className: "min-w-0", children: _jsx(ItemTitle, { children: label }) }), _jsx(ItemActions, { className: "ml-auto min-w-0 flex-none justify-end", children: _jsx("span", { className: mono
                        ? 'max-w-md break-all text-right font-mono text-[11px] text-foreground'
                        : 'max-w-md break-words text-right text-xs text-foreground', children: value }) })] }));
}
export default SkillDetailsPage;
