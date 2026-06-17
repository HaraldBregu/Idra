import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock3, LoaderCircle, Pause, Play, Trash2, } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsEmptyState, SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsSection, } from '../../components';
import { formatSchedule, formatJobSchedule, formatTimestamp, inputSummary, sortJobs, sortSchedules, statusLabelKey, statusVariant, } from './utils';
function CronLoadingList() {
    return (_jsx(SettingsPanel, { children: _jsx("div", { className: "grid gap-0", children: [0, 1, 2].map((index) => (_jsxs("div", { className: "flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0", children: [_jsx(Skeleton, { className: "size-6 rounded-md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx(Skeleton, { className: "h-4 w-48 max-w-full" }), _jsx(Skeleton, { className: "mt-2 h-3 w-72 max-w-full" })] }), _jsx(Skeleton, { className: "h-7 w-20 rounded-md" })] }, index))) }) }));
}
function scheduleActionLabel(schedule) {
    return schedule.status === 'active' ? 'settings.cron.actions.pause' : 'settings.cron.actions.resume';
}
const CronPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState(null);
    const loadCronItems = useCallback(async (showLoading = false) => {
        if (showLoading)
            setLoading(true);
        try {
            const [nextSchedules, nextJobs] = await Promise.all([
                window.cron.listSchedules({ includeDeleted: false }),
                window.cron.listJobs(),
            ]);
            setSchedules(sortSchedules(nextSchedules));
            setJobs(sortJobs(nextJobs));
            setError(null);
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        let mounted = true;
        async function loadInitialSchedules() {
            setLoading(true);
            try {
                const [nextSchedules, nextJobs] = await Promise.all([
                    window.cron.listSchedules({ includeDeleted: false }),
                    window.cron.listJobs(),
                ]);
                if (!mounted)
                    return;
                setSchedules(sortSchedules(nextSchedules));
                setJobs(sortJobs(nextJobs));
                setError(null);
            }
            catch (caught) {
                if (mounted)
                    setError(caught instanceof Error ? caught.message : String(caught));
            }
            finally {
                if (mounted)
                    setLoading(false);
            }
        }
        void loadInitialSchedules();
        const unsubscribe = window.cron.subscribeToSchedules(() => {
            void loadCronItems(false);
        });
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [loadCronItems]);
    const navigateToSchedule = (scheduleId) => {
        navigate(`/settings/cron/crondetails/${encodeURIComponent(scheduleId)}`);
    };
    const toggleSchedule = async (schedule, event) => {
        event.stopPropagation();
        setBusyId(`toggle:${schedule.id}`);
        setError(null);
        try {
            if (schedule.status === 'active') {
                await window.cron.pauseSchedule(schedule.id);
            }
            else {
                await window.cron.resumeSchedule(schedule.id);
            }
            await loadCronItems(false);
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusyId(null);
        }
    };
    const runSchedule = async (schedule, event) => {
        event.stopPropagation();
        setBusyId(`run:${schedule.id}`);
        setError(null);
        try {
            await window.cron.runNow(schedule.id);
            await loadCronItems(false);
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusyId(null);
        }
    };
    const deleteSchedule = async (schedule, event) => {
        event.stopPropagation();
        if (!window.confirm(t('settings.cron.actions.confirmRemove', { id: schedule.name })))
            return;
        setBusyId(`delete:${schedule.id}`);
        setError(null);
        try {
            await window.cron.deleteSchedule(schedule.id);
            await loadCronItems(false);
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusyId(null);
        }
    };
    const deleteJob = async (job, event) => {
        event.stopPropagation();
        if (!window.confirm(t('settings.cron.actions.confirmRemoveJob', { id: job.name })))
            return;
        setBusyId(`job:${job.id}`);
        setError(null);
        try {
            await window.cron.deleteJob(job.id);
            await loadCronItems(false);
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setBusyId(null);
        }
    };
    const empty = schedules.length === 0 && jobs.length === 0;
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.tabs.taskScheduler'), description: t('settings.cron.description') }), _jsxs(SettingsSection, { title: t('settings.sections.taskScheduler'), children: [error && (_jsx(SettingsPanel, { children: _jsxs("div", { className: "flex min-w-0 items-start gap-2 px-3 py-2 text-destructive", children: [_jsx(AlertCircle, { className: "mt-0.5 size-3.5 shrink-0", strokeWidth: 1.8 }), _jsx("div", { className: "min-w-0 text-xs leading-5", children: error })] }) })), loading ? (_jsx(CronLoadingList, {})) : empty ? (_jsx(SettingsPanel, { children: _jsx(SettingsEmptyState, { icon: Clock3, title: t('settings.cron.emptyTitle'), description: t('settings.cron.emptyDescription'), className: "min-h-28" }) })) : (_jsxs("div", { className: "grid gap-3", children: [schedules.length > 0 && (_jsxs(SettingsPanel, { children: [_jsxs("div", { className: "border-b border-border/60 px-3 py-2", children: [_jsx("div", { className: "text-xs font-medium text-foreground", children: t('settings.cron.schedulesTitle') }), _jsx("div", { className: "mt-0.5 text-[11px] leading-4 text-muted-foreground", children: t('settings.cron.schedulesDescription') })] }), _jsx("div", { className: "grid gap-0", children: schedules.map((schedule) => {
                                            const toggleBusy = busyId === `toggle:${schedule.id}`;
                                            const runBusy = busyId === `run:${schedule.id}`;
                                            const deleteBusy = busyId === `delete:${schedule.id}`;
                                            const anyBusy = Boolean(busyId);
                                            return (_jsxs("div", { role: "button", tabIndex: 0, onClick: () => navigateToSchedule(schedule.id), onKeyDown: (event) => {
                                                    if (event.key !== 'Enter' && event.key !== ' ')
                                                        return;
                                                    event.preventDefault();
                                                    navigateToSchedule(schedule.id);
                                                }, className: "grid gap-2 border-b border-border/60 px-3 py-2 outline-none last:border-b-0 focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center", children: [_jsxs("div", { className: "flex min-w-0 items-start gap-2", children: [_jsx("span", { className: "flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground", children: _jsx(Clock3, { className: "size-3", strokeWidth: 1.8 }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-[13px] font-medium text-foreground", children: schedule.name }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-1.5", children: [_jsx(Badge, { variant: statusVariant(schedule.status), className: "h-4 px-1.5 text-[10px]", children: t(statusLabelKey(schedule.status)) }), _jsx(Badge, { variant: "outline", className: "h-4 px-1.5 text-[10px]", children: schedule.taskType }), _jsx(Badge, { variant: "outline", className: "h-4 max-w-full px-1.5 font-mono text-[10px]", children: _jsx("span", { className: "truncate", children: formatSchedule(schedule) }) }), _jsxs(Badge, { variant: "outline", className: "h-4 px-1.5 text-[10px]", children: [t('settings.cron.nextRun'), ": ", formatTimestamp(schedule.nextRunAt)] })] }), schedule.description || schedule.taskInput ? (_jsx("p", { className: "mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground", children: schedule.description || inputSummary(schedule) })) : null] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-1.5 sm:justify-end", children: [_jsxs(Button, { type: "button", size: "xs", variant: "outline", disabled: anyBusy || schedule.status === 'deleted', onClick: (event) => void toggleSchedule(schedule, event), "aria-label": t(scheduleActionLabel(schedule)), children: [toggleBusy ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : schedule.status === 'active' ? (_jsx(Pause, { className: "size-3" })) : (_jsx(Play, { className: "size-3" })), t(scheduleActionLabel(schedule))] }), _jsxs(Button, { type: "button", size: "xs", variant: "outline", disabled: anyBusy || schedule.status === 'deleted', onClick: (event) => void runSchedule(schedule, event), "aria-label": t('settings.cron.actions.run'), children: [runBusy ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : (_jsx(Play, { className: "size-3" })), t('settings.cron.actions.run')] }), _jsx(Button, { type: "button", size: "icon-xs", variant: "destructive", disabled: anyBusy, onClick: (event) => void deleteSchedule(schedule, event), "aria-label": t('settings.cron.actions.removeLabel', { id: schedule.name }), children: deleteBusy ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : (_jsx(Trash2, { className: "size-3" })) })] })] }, schedule.id));
                                        }) })] })), jobs.length > 0 && (_jsxs(SettingsPanel, { children: [_jsxs("div", { className: "border-b border-border/60 px-3 py-2", children: [_jsx("div", { className: "text-xs font-medium text-foreground", children: t('settings.cron.jobsTitle') }), _jsx("div", { className: "mt-0.5 text-[11px] leading-4 text-muted-foreground", children: t('settings.cron.jobsDescription') })] }), _jsx("div", { className: "grid gap-0", children: jobs.map((job) => {
                                            const deleteBusy = busyId === `job:${job.id}`;
                                            const anyBusy = Boolean(busyId);
                                            return (_jsxs("div", { className: "grid gap-2 border-b border-border/60 px-3 py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center", children: [_jsxs("div", { className: "flex min-w-0 items-start gap-2", children: [_jsx("span", { className: "flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground", children: _jsx(Clock3, { className: "size-3", strokeWidth: 1.8 }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-[13px] font-medium text-foreground", children: job.name }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-1.5", children: [_jsx(Badge, { variant: statusVariant(job.status), className: "h-4 px-1.5 text-[10px]", children: t(statusLabelKey(job.status)) }), _jsx(Badge, { variant: "outline", className: "h-4 px-1.5 text-[10px]", children: job.target ?? 'job' }), _jsx(Badge, { variant: "outline", className: "h-4 max-w-full px-1.5 font-mono text-[10px]", children: _jsx("span", { className: "truncate", children: formatJobSchedule(job) }) })] }), job.description ? (_jsx("p", { className: "mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground", children: job.description })) : null] })] }), _jsx("div", { className: "flex flex-wrap items-center gap-1.5 sm:justify-end", children: _jsx(Button, { type: "button", size: "icon-xs", variant: "destructive", disabled: anyBusy, onClick: (event) => void deleteJob(job, event), "aria-label": t('settings.cron.actions.removeJobLabel', { id: job.name }), children: deleteBusy ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : (_jsx(Trash2, { className: "size-3" })) }) })] }, job.id));
                                        }) })] }))] }))] })] }));
};
export default CronPage;
