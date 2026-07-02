import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Accessibility,
	FolderOpen,
	Languages,
	MonitorUp,
	PanelTop,
	SunMoon,
	type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemIcon, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useApp, type AppLanguage, type AppTheme } from '@/contexts';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { MediaPermissionsSection } from '../../components/media';
import type { SystemPreferencePaneId } from '../../../../../../shared/app_permissions';
import {
	SYSTEM_CAPABILITY_GROUPS,
	type SystemCapabilityAvailability,
	type SystemCapabilityGroup,
	type SystemCapabilityItem,
} from '../system/capabilities';

interface LanguageOption {
	readonly value: AppLanguage;
	readonly labelKey: string;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
	{ value: 'en', labelKey: 'settings.language.en' },
	{ value: 'it', labelKey: 'settings.language.it' },
] as const;

interface ThemeOption {
	readonly value: AppTheme;
	readonly labelKey: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
	{ value: 'light', labelKey: 'settings.theme.light' },
	{ value: 'dark', labelKey: 'settings.theme.dark' },
	{ value: 'system', labelKey: 'settings.theme.system' },
] as const;

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

function availabilityClassName(availability: SystemCapabilityAvailability): string {
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

function AvailabilityBadge({
	availability,
}: {
	readonly availability: SystemCapabilityAvailability;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<span
			className={cn(
				'inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[11px] font-medium',
				availabilityClassName(availability)
			)}
		>
			{t(`settings.system.availability.${availability}`)}
		</span>
	);
}

function SystemSettingsItem({
	title,
	description,
	icon,
	actions,
	actionClassName,
}: {
	readonly title: React.ReactNode;
	readonly description?: React.ReactNode;
	readonly icon: LucideIcon;
	readonly actions?: React.ReactNode;
	readonly actionClassName?: string;
}): React.JSX.Element {
	return (
		<Item variant="outline" size="md" className="min-h-11 border-b border-border/60 last:border-b-0">
			<ItemIcon icon={icon} className="[&_svg]:size-4" />
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0.5">
				<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
					{title}
				</ItemTitle>
				{description && (
					<p className="max-w-full text-[11px] leading-4 text-muted-foreground">
						{description}
					</p>
				)}
			</ItemContent>
			{actions && (
				<ItemActions
					className={cn(
						'ml-auto flex-none flex-wrap justify-end gap-1.5',
						actionClassName
					)}
				>
					{actions}
				</ItemActions>
			)}
		</Item>
	);
}

function SystemCapabilityRow({
	capability,
}: {
	readonly capability: SystemCapabilityItem;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<SystemSettingsItem
			title={t(capability.titleKey)}
			description={t(capability.noteKey)}
			icon={capability.icon}
			actions={<AvailabilityBadge availability={capability.availability} />}
		/>
	);
}

function SystemCapabilityGroupPanel({
	group,
}: {
	readonly group: SystemCapabilityGroup;
}): React.JSX.Element {
	return (
		<SettingsPanel className="h-full">
			{group.capabilities.map((capability) => (
				<SystemCapabilityRow key={capability.id} capability={capability} />
			))}
		</SettingsPanel>
	);
}

const ApplicationPage: React.FC = () => {
	const { t } = useTranslation();
	const { language, setLanguage, theme, setTheme } = useApp();
	const [trayEnabled, setTrayEnabled] = useState(true);
	const [systemPreferenceError, setSystemPreferenceError] = useState('');

	useEffect(() => {
		void window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		void window.app.setTrayEnabled(checked);
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		void window.app.openAppDataFolder();
	}, []);

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	const handleThemeChange = (next: string | null): void => {
		if (next === null) return;
		const option = THEME_OPTIONS.find((o) => o.value === next);
		if (option) setTheme(option.value);
	};

	const handleOpenSystemPreference = useCallback((pane: SystemPreferencePaneId) => {
		setSystemPreferenceError('');
		void window.app.openSystemPreference(pane)
			.catch((error: unknown) => {
				setSystemPreferenceError(errorMessage(error, t('settings.system.errors.openPreference')));
			});
	}, [t]);

	const handleOpenAccessibility = useCallback(() => {
		handleOpenSystemPreference('Accessibility');
	}, [handleOpenSystemPreference]);

	const handleOpenScreenRecording = useCallback(() => {
		handleOpenSystemPreference('ScreenCapture');
	}, [handleOpenSystemPreference]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.application')} />

			<SettingsSection title={t('settings.application.information')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent>
							<ItemTitle>{t('settings.application.name')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="text-[13px] text-foreground">{__APP_NAME__}</span>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent>
							<ItemTitle>{t('settings.application.version')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="font-mono text-[13px] text-foreground">{__APP_VERSION__}</span>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<PanelTop className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.menuBar')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} aria-label={t('settings.application.menuBar')} />
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<FolderOpen className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.appData')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenAppDataFolder}>
								{t('settings.application.openAppData')}
							</Button>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.sections.layout')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Languages className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.language.title')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Select value={language} onValueChange={handleLanguageChange}>
								<SelectTrigger
									size="sm"
									className="w-36 text-xs [&_svg]:size-3"
									aria-label={t('settings.language.title')}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{LANGUAGE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{t(option.labelKey)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<SunMoon className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.theme.title')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Select value={theme} onValueChange={handleThemeChange}>
								<SelectTrigger
									size="sm"
									className="w-36 text-xs [&_svg]:size-3"
									aria-label={t('settings.theme.title')}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{THEME_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{t(option.labelKey)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			{systemPreferenceError && (
				<SettingsNotice variant="destructive">{systemPreferenceError}</SettingsNotice>
			)}

			<MediaPermissionsSection />

			<SettingsSection
				title={t('settings.application.actions')}
				className="mt-4"
			>
				<SettingsPanel>
					<SystemSettingsItem
						title={t('settings.application.accessibility')}
						description={t('settings.application.accessibilityDescription')}
						icon={Accessibility}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility}>
								{t('settings.application.openAccessibility')}
							</Button>
						}
					/>
					<SystemSettingsItem
						title={t('settings.application.screenRecording')}
						description={t('settings.application.screenRecordingDescription')}
						icon={MonitorUp}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenScreenRecording}>
								{t('settings.application.openScreenRecording')}
							</Button>
						}
					/>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.system.capabilities.title')}
				className="mt-4"
			>
				<div className="grid gap-3 lg:grid-cols-2">
					{SYSTEM_CAPABILITY_GROUPS.map((group) => (
						<SystemCapabilityGroupPanel key={group.id} group={group} />
					))}
				</div>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ApplicationPage;
