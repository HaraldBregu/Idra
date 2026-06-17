import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Clock3, LoaderCircle, Pause, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsEmptyState, SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsSection, } from '../../../components';
import { formatSchedule, formatTimestamp, inputEntries, inputSummary, isCronSchedule, statusLabelKey, statusVariant, } from '../utils';
function CronDetail({ label, value, mono, }) {
    return (_jsxs("div", { className: "min-w-0 rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5", children: [_jsx("dt", { className: "text-[10px] font-medium uppercase text-muted-foreground", children: label }), _jsx("dd", { className: mono
                    ? 'mt-0.5 min-w-0 break-words font-mono text-[11px] text-foreground'
                    : 'mt-0.5 min-w-0 break-words text-xs text-foreground', children: value })] }));
}
function actionLabel(schedule) {
    return schedule.status === 'active' ? 'settings.cron.actions.pause' : 'settings.cron.actions.resume';
}
const CronDetailsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { jobId } = useParams();
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyAction, setBusyAction] = useState(null);
    const loadSchedule = useCallback(async () => {
        if (!jobId) {
            setLoading(false);
            setError(t('settings.cron.notFoundDescription'));
            return;
        }
        setLoading(true);
        try {
            const nextSchedule = await window.cron.getSchedule(jobId);
            if (!isCronSchedule(nextSchedule)) {
                throw new Error(t('settings.cron.notFoundDescription'));
            }
            setSchedule(nextSchedule);
            setError(null);
        }
        catch (caught) {
            setSchedule(null);
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setLoading(false);
        }
    }, [jobId, t]);
    useEffect(() => {
        let mounted = true;
        async function load() {
            if (!mounted)
                return;
            await loadSchedule();
        }
        void load();
        return () => {
            mounted = false;
        };
    }, [loadSchedule]);
    const toggleSchedule = async () => {
        if (!schedule)
            return;
        setBusyAction('toggle');
        setError(null);
        try {
            if (schedule.status === 'active') {
                await window.cron.pauseSchedule(schedule.id);
            }
            else {
                await window.cron.resumeSchedule(schedule.id);
            }
            await loadSchedule();
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusyAction(null);
        }
    };
    const runSchedule = async () => {
        if (!schedule)
            return;
        setBusyAction('run');
        setError(null);
        try {
            await window.cron.runNow(schedule.id);
            await loadSchedule();
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusyAction(null);
        }
    };
    const deleteSchedule = async () => {
        if (!schedule)
            return;
        if (!window.confirm(t('settings.cron.actions.confirmRemove', { id: schedule.name })))
            return;
        setBusyAction('delete');
        setError(null);
        try {
            await window.cron.deleteSchedule(schedule.id);
            navigate('/settings/cron');
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
            setBusyAction(null);
        }
    };
    if (loading) {
        return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.cron.detailsTitle') }), _jsx(SettingsPanel, { children: _jsxs("div", { className: "p-3", children: [_jsx(Skeleton, { className: "h-5 w-56 max-w-full" }), _jsx(Skeleton, { className: "mt-3 h-16 w-full" })] }) })] }));
    }
    if (!schedule) {
        return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.cron.detailsTitle') }), _jsx(SettingsPanel, { children: _jsx(SettingsEmptyState, { icon: Clock3, title: t('settings.cron.notFoundTitle'), description: error ?? t('settings.cron.notFoundDescription'), className: "min-h-28" }) })] }));
    }
    const entries = inputEntries(schedule);
    const busy = busyAction !== null;
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: schedule.name, description: schedule.description, action: _jsxs(_Fragment, { children: [_jsxs(Button, { type: "button", size: "sm", variant: "outline", disabled: busy || schedule.status === 'deleted', onClick: () => void toggleSchedule(), children: [busyAction === 'toggle' ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : schedule.status === 'active' ? (_jsx(Pause, { className: "size-3" })) : (_jsx(Play, { className: "size-3" })), t(actionLabel(schedule))] }), _jsxs(Button, { type: "button", size: "sm", variant: "outline", disabled: busy || schedule.status === 'deleted', onClick: () => void runSchedule(), children: [busyAction === 'run' ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : (_jsx(Play, { className: "size-3" })), t('settings.cron.actions.run')] })] }) }), error && (_jsx(SettingsPanel, { children: _jsxs("div", { className: "flex min-w-0 items-start gap-2 px-3 py-2 text-destructive", children: [_jsx(AlertCircle, { className: "mt-0.5 size-3.5 shrink-0", strokeWidth: 1.8 }), _jsx("div", { className: "min-w-0 text-xs leading-5", children: error })] }) })), _jsx(SettingsSection, { title: t('settings.cron.details.prompt'), children: _jsx(SettingsPanel, { children: _jsxs("div", { className: "px-3 py-2", children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-1.5", children: [_jsx(Badge, { variant: statusVariant(schedule.status), className: "h-4 px-1.5 text-[10px]", children: t(statusLabelKey(schedule.status)) }), _jsx(Badge, { variant: "outline", className: "h-4 px-1.5 text-[10px]", children: schedule.taskType }), _jsx(Badge, { variant: "outline", className: "h-4 px-1.5 text-[10px]", children: schedule.type })] }), _jsx("p", { className: "whitespace-pre-wrap break-words text-xs leading-5 text-foreground", children: inputSummary(schedule) })] }) }) }), _jsx(SettingsSection, { title: t('settings.cron.detailsTitle'), children: _jsx(SettingsPanel, { children: _jsxs("dl", { className: "grid gap-2 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx(CronDetail, { label: t('settings.cron.details.id'), value: schedule.id, mono: true }), _jsx(CronDetail, { label: t('settings.cron.details.schedule'), value: formatSchedule(schedule), mono: true }), _jsx(CronDetail, { label: t('settings.cron.details.timezone'), value: schedule.timezone, mono: true }), _jsx(CronDetail, { label: t('settings.cron.details.visibility'), value: schedule.visibility, mono: true }), _jsx(CronDetail, { label: t('settings.cron.details.createdAt'), value: formatTimestamp(schedule.createdAt) }), _jsx(CronDetail, { label: t('settings.cron.details.updatedAt'), value: formatTimestamp(schedule.updatedAt) }), _jsx(CronDetail, { label: t('settings.cron.details.lastRun'), value: formatTimestamp(schedule.lastRunAt) }), _jsx(CronDetail, { label: t('settings.cron.details.nextRun'), value: formatTimestamp(schedule.nextRunAt) }), _jsx(CronDetail, { label: t('settings.cron.details.source'), value: schedule.source, mono: true }), _jsx(CronDetail, { label: t('settings.cron.details.runCount'), value: schedule.runCount }), _jsx(CronDetail, { label: t('settings.cron.details.failureCount'), value: schedule.failureCount ?? 0 })] }) }) }), entries.length > 0 && (_jsx(SettingsSection, { title: t('settings.cron.details.payload'), children: _jsx(SettingsPanel, { children: _jsx("dl", { className: "grid gap-2 px-3 py-2 sm:grid-cols-2", children: entries.map(([key, value]) => (_jsx(CronDetail, { label: key, value: value, mono: true }, key))) }) }) })), _jsx("div", { className: "border-t border-border/60 pt-3", children: _jsxs(Button, { type: "button", size: "lg", variant: "destructive", className: "w-full", disabled: busy, onClick: () => void deleteSchedule(), "aria-label": t('settings.cron.actions.removeLabel', { id: schedule.name }), children: [busyAction === 'delete' ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : (_jsx(Trash2, { className: "size-3" })), busyAction === 'delete'
                            ? t('settings.cron.actions.removing')
                            : t('settings.cron.actions.remove')] }) })] }));
};
export default CronDetailsPage;
