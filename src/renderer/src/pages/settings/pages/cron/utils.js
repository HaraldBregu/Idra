export function formatTimestamp(value) {
    if (value === undefined || value === '')
        return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return '-';
    return date.toLocaleString();
}
export function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0)
        return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}
function formatValue(value) {
    if (value === undefined || value === null || value === '')
        return '-';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    return JSON.stringify(value);
}
export function formatSchedule(schedule) {
    if (schedule.type === 'cron' && schedule.cronExpression) {
        return `${schedule.cronExpression} ${schedule.timezone}`;
    }
    if (['interval', 'fixedRate', 'fixedDelay'].includes(schedule.type) && schedule.intervalMs) {
        return `Every ${formatDuration(schedule.intervalMs)}`;
    }
    if (schedule.type === 'oneTime' && schedule.runAt) {
        return formatTimestamp(schedule.runAt);
    }
    if (schedule.type === 'manual')
        return 'Manual';
    return schedule.type;
}
export function formatJobSchedule(job) {
    return job.timezone ? `${job.expression} ${job.timezone}` : job.expression;
}
export function inputSummary(schedule) {
    return formatValue(schedule.taskInput);
}
export function inputEntries(schedule) {
    const input = schedule.taskInput;
    if (!input || typeof input !== 'object' || Array.isArray(input))
        return [];
    return Object.entries(input)
        .map(([key, value]) => [key, formatValue(value)])
        .filter(([, value]) => value !== '-');
}
export function statusLabelKey(status) {
    return `settings.cron.status.${status}`;
}
export function statusVariant(status) {
    switch (status) {
        case 'failed':
        case 'deleted':
            return 'destructive';
        case 'paused':
        case 'disabled':
        case 'expired':
        case 'completed':
            return 'secondary';
        case 'active':
            return 'outline';
    }
}
export function isCronSchedule(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.type === 'string' &&
        typeof value.status === 'string' &&
        typeof value.taskType === 'string');
}
export function sortSchedules(schedules) {
    return [...schedules].sort((left, right) => {
        const leftTime = Date.parse(left.nextRunAt ?? left.updatedAt);
        const rightTime = Date.parse(right.nextRunAt ?? right.updatedAt);
        return (Number.isNaN(leftTime) ? Number.MAX_SAFE_INTEGER : leftTime) -
            (Number.isNaN(rightTime) ? Number.MAX_SAFE_INTEGER : rightTime);
    });
}
export function sortJobs(jobs) {
    return [...jobs].sort((left, right) => left.name.localeCompare(right.name));
}
