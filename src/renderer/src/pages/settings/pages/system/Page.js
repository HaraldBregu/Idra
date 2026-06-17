import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Accessibility, Camera, Mic, MonitorCog, MonitorUp, RefreshCw, ShieldCheck, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsSection, } from '../../components';
import { SYSTEM_CAPABILITY_GROUPS, } from './capabilities';
const DEFAULT_MICROPHONE_PERMISSION = {
    enabled: true,
    systemStatus: 'unknown',
    canRequest: false,
};
const DEFAULT_CAMERA_PERMISSION = {
    enabled: true,
    systemStatus: 'unknown',
    canRequest: false,
};
const MEDIA_PERMISSION_COPY = {
    microphone: {
        enabledTitleKey: 'settings.microphone.recording',
        enabledDescriptionKey: 'settings.microphone.recordingDescription',
        systemPermissionKey: 'settings.microphone.systemPermission',
        systemPermissionDescriptionKey: 'settings.microphone.systemPermissionDescription',
        refreshKey: 'settings.microphone.actions.refresh',
    },
    camera: {
        enabledTitleKey: 'settings.camera.access',
        enabledDescriptionKey: 'settings.camera.accessDescription',
        systemPermissionKey: 'settings.camera.systemPermission',
        systemPermissionDescriptionKey: 'settings.camera.systemPermissionDescription',
        refreshKey: 'settings.camera.actions.refresh',
    },
};
function permissionStatusKey(status) {
    return `settings.system.permissionStatus.${status}`;
}
function isBlockedPermission(permission) {
    return permission.systemStatus === 'denied' || permission.systemStatus === 'restricted';
}
function shouldOpenPermissionSettings(permission) {
    return permission.enabled && !permission.canRequest && isBlockedPermission(permission);
}
function mediaPermissionActionKey(kind, permission) {
    if (!permission.enabled)
        return `settings.${kind}.actions.activate`;
    if (permission.systemStatus === 'granted')
        return `settings.${kind}.actions.check`;
    if (shouldOpenPermissionSettings(permission))
        return `settings.${kind}.actions.openSettings`;
    return `settings.${kind}.actions.request`;
}
function errorMessage(error, fallback) {
    return error instanceof Error ? error.message : fallback;
}
function permissionStatusClassName(status) {
    switch (status) {
        case 'granted':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
        case 'denied':
        case 'restricted':
            return 'border-destructive/30 bg-destructive/10 text-destructive';
        case 'not-determined':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
        default:
            return 'border-border/60 bg-muted/50 text-muted-foreground';
    }
}
function availabilityClassName(availability) {
    switch (availability) {
        case 'yes':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
        case 'oftenYes':
            return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
        case 'sometimes':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
        case 'comingSoon':
            return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300';
    }
}
function PermissionStatusBadge({ status, }) {
    const { t } = useTranslation();
    return (_jsx("span", { className: cn('inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[11px] font-medium', permissionStatusClassName(status)), children: t(permissionStatusKey(status)) }));
}
function AvailabilityBadge({ availability, }) {
    const { t } = useTranslation();
    return (_jsx("span", { className: cn('inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[11px] font-medium', availabilityClassName(availability)), children: t(`settings.system.availability.${availability}`) }));
}
function SystemSettingsItem({ title, description, icon, actions, actionClassName, }) {
    return (_jsxs(Item, { variant: "outline", size: "md", className: "min-h-11 border-b border-border/60 last:border-b-0", children: [_jsx(ItemIcon, { icon: icon }), _jsxs(ItemContent, { className: "min-w-0 flex-1 flex-col items-start gap-0.5", children: [_jsx(ItemTitle, { className: "w-full max-w-full truncate leading-4 tracking-normal", children: title }), description && (_jsx("p", { className: "max-w-full text-[11px] leading-4 text-muted-foreground", children: description }))] }), actions && (_jsx(ItemActions, { className: cn('ml-auto flex-none flex-wrap justify-end gap-1.5', actionClassName), children: actions }))] }));
}
function MediaPermissionRows({ kind, icon: Icon, permission, loading, error, onToggle, onAction, onRefresh, }) {
    const { t } = useTranslation();
    const copy = MEDIA_PERMISSION_COPY[kind];
    return (_jsxs(_Fragment, { children: [_jsx(SystemSettingsItem, { title: t(copy.enabledTitleKey), description: t(copy.enabledDescriptionKey), icon: Icon, actions: _jsx(Switch, { checked: permission.enabled, disabled: loading, onCheckedChange: onToggle, "aria-label": t(copy.enabledTitleKey) }) }), _jsx(SystemSettingsItem, { title: t(copy.systemPermissionKey), description: error || t(copy.systemPermissionDescriptionKey), icon: ShieldCheck, actionClassName: "sm:flex-nowrap", actions: _jsxs(_Fragment, { children: [_jsx(PermissionStatusBadge, { status: permission.systemStatus }), _jsx(Button, { variant: "outline", size: "xs", onClick: onAction, disabled: loading, children: t(mediaPermissionActionKey(kind, permission)) }), _jsx(Button, { variant: "ghost", size: "icon-xs", onClick: onRefresh, disabled: loading, "aria-label": t(copy.refreshKey), title: t(copy.refreshKey), children: _jsx(RefreshCw, { className: "size-3" }) })] }) })] }));
}
function SystemCapabilityRow({ capability, }) {
    const { t } = useTranslation();
    return (_jsx(SystemSettingsItem, { title: t(capability.titleKey), description: t(capability.noteKey), icon: capability.icon, actions: _jsx(AvailabilityBadge, { availability: capability.availability }) }));
}
function SystemCapabilityGroupPanel({ group, }) {
    const { t } = useTranslation();
    return (_jsxs(SettingsPanel, { className: "h-full", children: [_jsxs("div", { className: "border-b border-border/60 px-3 py-2", children: [_jsx("h3", { className: "text-[13px] font-medium leading-4 text-foreground", children: t(group.titleKey) }), _jsx("p", { className: "mt-0.5 text-[11px] leading-4 text-muted-foreground", children: t(group.descriptionKey) })] }), group.capabilities.map((capability) => (_jsx(SystemCapabilityRow, { capability: capability }, capability.id)))] }));
}
const SystemPage = () => {
    const { t } = useTranslation();
    const [systemPreferenceError, setSystemPreferenceError] = useState('');
    const [microphonePermission, setMicrophonePermission] = useState(DEFAULT_MICROPHONE_PERMISSION);
    const [microphoneLoading, setMicrophoneLoading] = useState(true);
    const [microphoneError, setMicrophoneError] = useState('');
    const [cameraPermission, setCameraPermission] = useState(DEFAULT_CAMERA_PERMISSION);
    const [cameraLoading, setCameraLoading] = useState(true);
    const [cameraError, setCameraError] = useState('');
    const refreshMicrophonePermission = useCallback(async () => {
        setMicrophoneLoading(true);
        setMicrophoneError('');
        try {
            setMicrophonePermission(await window.app.getMicrophonePermission());
        }
        catch (error) {
            setMicrophoneError(errorMessage(error, t('settings.microphone.errors.load')));
        }
        finally {
            setMicrophoneLoading(false);
        }
    }, [t]);
    const refreshCameraPermission = useCallback(async () => {
        setCameraLoading(true);
        setCameraError('');
        try {
            setCameraPermission(await window.app.getCameraPermission());
        }
        catch (error) {
            setCameraError(errorMessage(error, t('settings.camera.errors.load')));
        }
        finally {
            setCameraLoading(false);
        }
    }, [t]);
    useEffect(() => {
        void refreshMicrophonePermission();
        void refreshCameraPermission();
    }, [refreshCameraPermission, refreshMicrophonePermission]);
    const handleMicrophoneToggle = useCallback((checked) => {
        setMicrophoneLoading(true);
        setMicrophoneError('');
        setMicrophonePermission((current) => ({ ...current, enabled: checked }));
        void (async () => {
            try {
                setMicrophonePermission(await window.app.setMicrophoneEnabled(checked));
            }
            catch (error) {
                setMicrophoneError(errorMessage(error, t('settings.microphone.errors.save')));
                await refreshMicrophonePermission();
            }
            finally {
                setMicrophoneLoading(false);
            }
        })();
    }, [refreshMicrophonePermission, t]);
    const handleCameraToggle = useCallback((checked) => {
        setCameraLoading(true);
        setCameraError('');
        setCameraPermission((current) => ({ ...current, enabled: checked }));
        void (async () => {
            try {
                setCameraPermission(await window.app.setCameraEnabled(checked));
            }
            catch (error) {
                setCameraError(errorMessage(error, t('settings.camera.errors.save')));
                await refreshCameraPermission();
            }
            finally {
                setCameraLoading(false);
            }
        })();
    }, [refreshCameraPermission, t]);
    const handleMicrophoneAction = useCallback(async () => {
        setMicrophoneLoading(true);
        setMicrophoneError('');
        try {
            let next = microphonePermission;
            if (!next.enabled) {
                next = await window.app.setMicrophoneEnabled(true);
                setMicrophonePermission(next);
            }
            if (shouldOpenPermissionSettings(next)) {
                await window.app.openSystemPreference('Microphone');
                setMicrophonePermission(await window.app.getMicrophonePermission());
                return;
            }
            setMicrophonePermission(await window.app.requestMicrophonePermission());
        }
        catch (error) {
            setMicrophoneError(errorMessage(error, t('settings.microphone.errors.request')));
        }
        finally {
            setMicrophoneLoading(false);
        }
    }, [microphonePermission, t]);
    const handleCameraAction = useCallback(async () => {
        setCameraLoading(true);
        setCameraError('');
        try {
            let next = cameraPermission;
            if (!next.enabled) {
                next = await window.app.setCameraEnabled(true);
                setCameraPermission(next);
            }
            if (shouldOpenPermissionSettings(next)) {
                await window.app.openSystemPreference('Camera');
                setCameraPermission(await window.app.getCameraPermission());
                return;
            }
            setCameraPermission(await window.app.requestCameraPermission());
        }
        catch (error) {
            setCameraError(errorMessage(error, t('settings.camera.errors.request')));
        }
        finally {
            setCameraLoading(false);
        }
    }, [cameraPermission, t]);
    const handleOpenSystemPreference = useCallback((pane) => {
        setSystemPreferenceError('');
        void window.app.openSystemPreference(pane)
            .catch((error) => {
            setSystemPreferenceError(errorMessage(error, t('settings.system.errors.openPreference')));
        });
    }, [t]);
    const handleOpenAccessibility = useCallback(() => {
        handleOpenSystemPreference('Accessibility');
    }, [handleOpenSystemPreference]);
    const handleOpenScreenRecording = useCallback(() => {
        handleOpenSystemPreference('ScreenCapture');
    }, [handleOpenSystemPreference]);
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.tabs.system'), description: t('settings.system.description'), icon: MonitorCog }), systemPreferenceError && (_jsx(SettingsNotice, { variant: "destructive", children: systemPreferenceError })), _jsx(SettingsSection, { title: t('settings.system.mediaPermissions.title'), description: t('settings.system.mediaPermissions.description'), children: _jsxs(SettingsPanel, { children: [_jsx(MediaPermissionRows, { kind: "microphone", icon: Mic, permission: microphonePermission, loading: microphoneLoading, error: microphoneError, onToggle: handleMicrophoneToggle, onAction: () => void handleMicrophoneAction(), onRefresh: () => void refreshMicrophonePermission() }), _jsx(MediaPermissionRows, { kind: "camera", icon: Camera, permission: cameraPermission, loading: cameraLoading, error: cameraError, onToggle: handleCameraToggle, onAction: () => void handleCameraAction(), onRefresh: () => void refreshCameraPermission() })] }) }), _jsx(SettingsSection, { title: t('settings.application.actions'), description: t('settings.system.actionsDescription'), children: _jsxs(SettingsPanel, { children: [_jsx(SystemSettingsItem, { title: t('settings.application.accessibility'), description: t('settings.application.accessibilityDescription'), icon: Accessibility, actions: _jsx(Button, { variant: "outline", size: "xs", onClick: handleOpenAccessibility, children: t('settings.application.openAccessibility') }) }), _jsx(SystemSettingsItem, { title: t('settings.application.screenRecording'), description: t('settings.application.screenRecordingDescription'), icon: MonitorUp, actions: _jsx(Button, { variant: "outline", size: "xs", onClick: handleOpenScreenRecording, children: t('settings.application.openScreenRecording') }) })] }) }), _jsx(SettingsSection, { title: t('settings.system.capabilities.title'), description: t('settings.system.capabilities.description'), children: _jsx("div", { className: "grid gap-3 lg:grid-cols-2", children: SYSTEM_CAPABILITY_GROUPS.map((group) => (_jsx(SystemCapabilityGroupPanel, { group: group }, group.id))) }) })] }));
};
export default SystemPage;
