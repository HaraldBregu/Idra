import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
	Accessibility,
	BatteryCharging,
	Bot,
	ChevronRight,
	FolderOpen,
	ImageIcon,
	Languages,
	Mic,
	Monitor,
	MonitorUp,
	Moon,
	PanelTop,
	RefreshCw,
	ShieldCheck,
	Sun,
	Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { SettingsPageHeader, SettingsPageShell, SettingsSection } from '../../components';
import { Switch } from '@/components/ui/switch';
import { useApp, type AppLanguage } from '@/contexts';
import type { ThemeMode, ThemeVariant } from '../../../../../../shared';
import {
	IMAGE_ASSISTANT_AGENT_ID,
	SPEECH_TRANSCRIBER_AGENT_ID,
	TEXT_TO_SPEECH_AGENT_ID,
} from '../../../../../../shared/service';
import type {
	MicrophonePermissionSettings,
	MicrophoneSystemPermissionStatus,
} from '../../../../../../shared/app-permissions';

interface LanguageOption {
	readonly value: AppLanguage;
	readonly labelKey: string;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
	{ value: 'en', labelKey: 'settings.language.en' },
	{ value: 'it', labelKey: 'settings.language.it' },
] as const;

const TRANSLUCENCY_OPTIONS = [
	{
		value: 'light',
		labelKey: 'settings.translucency.light',
		descriptionKey: 'settings.translucency.lightDescription',
		icon: Sun,
	},
	{
		value: 'dark',
		labelKey: 'settings.translucency.dark',
		descriptionKey: 'settings.translucency.darkDescription',
		icon: Moon,
	},
] satisfies readonly {
	readonly value: ThemeVariant;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly icon: typeof Sun;
}[];

const FRIDAY_AGENT_ID = 'main';

const AGENT_ROWS = [
	{
		id: FRIDAY_AGENT_ID,
		nameKey: 'settings.agents.fridayName',
		descriptionKey: 'settings.agents.fridayDescription',
		icon: Bot,
		configurable: true,
	},
	{
		id: SPEECH_TRANSCRIBER_AGENT_ID,
		nameKey: 'settings.agents.speechTranscriberName',
		descriptionKey: 'settings.agents.speechTranscriberDescription',
		icon: Mic,
		configurable: true,
	},
	{
		id: TEXT_TO_SPEECH_AGENT_ID,
		nameKey: 'settings.agents.textToSpeechName',
		descriptionKey: 'settings.agents.textToSpeechDescription',
		icon: Volume2,
		configurable: true,
	},
	{
		id: IMAGE_ASSISTANT_AGENT_ID,
		nameKey: 'settings.agents.imageAssistantName',
		descriptionKey: 'settings.agents.imageAssistantDescription',
		icon: ImageIcon,
		configurable: true,
	},
] as const;

const DEFAULT_MICROPHONE_PERMISSION: MicrophonePermissionSettings = {
	enabled: true,
	systemStatus: 'unknown',
	canRequest: false,
};

function microphoneStatusKey(status: MicrophoneSystemPermissionStatus): string {
	return `settings.microphone.status.${status}`;
}

function microphoneActionKey(permission: MicrophonePermissionSettings): string {
	if (!permission.enabled) return 'settings.microphone.actions.activate';
	if (permission.systemStatus === 'granted') return 'settings.microphone.actions.check';
	return 'settings.microphone.actions.request';
}

const GeneralPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { theme, translucency, language, setTheme, setTranslucency, setLanguage } = useApp();

	const [trayEnabled, setTrayEnabled] = useState(true);
	const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(false);
	const [keepAwakeLoading, setKeepAwakeLoading] = useState(true);
	const [microphonePermission, setMicrophonePermission] = useState<MicrophonePermissionSettings>(
		DEFAULT_MICROPHONE_PERMISSION
	);
	const [microphoneLoading, setMicrophoneLoading] = useState(true);
	const [microphoneError, setMicrophoneError] = useState('');

	useEffect(() => {
		void window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

	useEffect(() => {
		let mounted = true;
		void window.app
			.getKeepAwakeEnabled()
			.then((enabled) => {
				if (mounted) setKeepAwakeEnabled(enabled);
			})
			.catch(() => {
				if (mounted) setKeepAwakeEnabled(false);
			})
			.finally(() => {
				if (mounted) setKeepAwakeLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	const refreshMicrophonePermission = useCallback(async (): Promise<void> => {
		setMicrophoneLoading(true);
		setMicrophoneError('');
		try {
			setMicrophonePermission(await window.app.getMicrophonePermission());
		} catch (error) {
			setMicrophoneError(
				error instanceof Error ? error.message : t('settings.microphone.errors.load')
			);
		} finally {
			setMicrophoneLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void refreshMicrophonePermission();
	}, [refreshMicrophonePermission]);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		void window.app.setTrayEnabled(checked);
	}, []);

	const handleKeepAwakeToggle = useCallback((checked: boolean) => {
		setKeepAwakeEnabled(checked);
		setKeepAwakeLoading(true);
		void window.app
			.setKeepAwakeEnabled(checked)
			.then(setKeepAwakeEnabled)
			.catch(() => {
				setKeepAwakeEnabled(!checked);
				void window.app
					.getKeepAwakeEnabled()
					.then(setKeepAwakeEnabled)
					.catch(() => undefined);
			})
			.finally(() => setKeepAwakeLoading(false));
	}, []);

	const handleMicrophoneToggle = useCallback(
		(checked: boolean) => {
			setMicrophonePermission((current) => ({ ...current, enabled: checked }));
			setMicrophoneError('');
			void window.app
				.setMicrophoneEnabled(checked)
				.then(setMicrophonePermission)
				.catch((error: unknown) => {
					setMicrophoneError(
						error instanceof Error ? error.message : t('settings.microphone.errors.save')
					);
					void refreshMicrophonePermission();
				});
		},
		[refreshMicrophonePermission, t]
	);

	const handleMicrophoneAction = useCallback(async (): Promise<void> => {
		setMicrophoneLoading(true);
		setMicrophoneError('');
		try {
			if (!microphonePermission.enabled) {
				await window.app.setMicrophoneEnabled(true);
			}
			setMicrophonePermission(await window.app.requestMicrophonePermission());
		} catch (error) {
			setMicrophoneError(
				error instanceof Error ? error.message : t('settings.microphone.errors.request')
			);
		} finally {
			setMicrophoneLoading(false);
		}
	}, [microphonePermission.enabled, t]);

	const handleOpenAccessibility = useCallback(() => {
		// window.app.openSystemAccessibility();
	}, []);

	const handleOpenScreenRecording = useCallback(() => {
		// window.app.openSystemScreenRecording();
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		void window.app.openAppDataFolder();
	}, []);

	const handleOpenUserDataFolder = useCallback(() => {
		void window.app.openUserDataFolder();
	}, []);

	const openAgent = useCallback(
		(agentId: string) => {
			navigate(`/settings/general/agentdetails/${encodeURIComponent(agentId)}`);
		},
		[navigate]
	);

	const handleAgentKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLElement>, agentId: string) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			openAgent(agentId);
		},
		[openAgent]
	);

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	const handleTranslucencyChange =
		(mode: ThemeVariant) =>
		(values: number[]): void => {
			setTranslucency(mode, values[0] ?? 0);
		};

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.general')} />

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
							<ItemTitle>{t('settings.application.description')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="text-[13px] text-foreground">{__APP_DESCRIPTION__}</span>
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

			<SettingsSection title={t('settings.agents.title')}>
				<Card size="sm" className="gap-0! p-0!">
					{AGENT_ROWS.map((agent) => {
						const Icon = agent.icon;
						return (
							<Item
								key={agent.id}
								role={agent.configurable ? 'button' : undefined}
								tabIndex={agent.configurable ? 0 : undefined}
								variant="outline"
								size="md"
								className={
									agent.configurable
										? 'cursor-pointer border-b border-border/60 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/55'
										: 'border-b border-border/60 last:border-b-0'
								}
								onClick={agent.configurable ? () => openAgent(agent.id) : undefined}
								onKeyDown={
									agent.configurable ? (event) => handleAgentKeyDown(event, agent.id) : undefined
								}
							>
								<ItemMedia variant="icon">
									<Icon className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
									<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
										{t(agent.nameKey)}
									</ItemTitle>
									<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
										{t(agent.descriptionKey)}
									</p>
								</ItemContent>
								{agent.configurable && (
									<ItemActions className="ml-auto flex-none justify-end">
										<ChevronRight className="size-3 text-muted-foreground" strokeWidth={1.8} />
									</ItemActions>
								)}
							</Item>
						);
					})}
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.sections.layout')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Monitor className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.theme.title')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<ButtonGroup>
								{[
									{ value: 'light', label: t('settings.theme.light'), icon: Sun },
									{ value: 'system', label: t('settings.theme.system'), icon: Monitor },
									{ value: 'dark', label: t('settings.theme.dark'), icon: Moon },
								].map((option) => {
									const Icon = option.icon;
									const value = option.value as ThemeMode;
									return (
										<Button
											key={option.value}
											variant={theme === value ? 'secondary' : 'outline'}
											size="icon-xs"
											onClick={() => setTheme(value)}
											aria-label={option.label}
											aria-pressed={theme === value}
											title={option.label}
										>
											<Icon className="size-3" />
										</Button>
									);
								})}
							</ButtonGroup>
						</ItemActions>
					</Item>
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
				</Card>
			</SettingsSection>

			<SettingsSection
				title={t('settings.translucency.title')}
				description={t('settings.translucency.description')}
			>
				<Card size="sm" className="gap-0! p-0!">
					{TRANSLUCENCY_OPTIONS.map((option) => {
						const Icon = option.icon;
						const value = translucency[option.value];
						return (
							<Item
								key={option.value}
								variant="outline"
								size="md"
								className="border-b border-border/60"
							>
								<ItemMedia variant="icon">
									<Icon className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>{t(option.labelKey)}</ItemTitle>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end gap-3">
									<Slider
										min={0}
										max={100}
										step={1}
										value={[value]}
										onValueChange={handleTranslucencyChange(option.value)}
										aria-label={t(option.labelKey)}
										className="w-40 sm:w-56"
									/>
									<span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
										{t('settings.translucency.value', { value })}
									</span>
								</ItemActions>
							</Item>
						);
					})}
				</Card>
			</SettingsSection>

			<SettingsSection
				title={t('settings.microphone.title')}
				description={t('settings.microphone.description')}
			>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Mic className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.microphone.recording')}</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{t('settings.microphone.recordingDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch
								checked={microphonePermission.enabled}
								disabled={microphoneLoading}
								onCheckedChange={handleMicrophoneToggle}
								aria-label={t('settings.microphone.recording')}
							/>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<ShieldCheck className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.microphone.systemPermission')}</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{microphoneError || t('settings.microphone.systemPermissionDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end gap-2">
							<span className="rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
								{t(microphoneStatusKey(microphonePermission.systemStatus))}
							</span>
							<Button
								variant="outline"
								size="xs"
								onClick={() => void handleMicrophoneAction()}
								disabled={microphoneLoading}
							>
								{t(microphoneActionKey(microphonePermission))}
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={() => void refreshMicrophonePermission()}
								disabled={microphoneLoading}
								aria-label={t('settings.microphone.actions.refresh')}
								title={t('settings.microphone.actions.refresh')}
							>
								<RefreshCw className="size-3" />
							</Button>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Accessibility className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.accessibility')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility}>
								{t('settings.application.openAccessibility')}
							</Button>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<MonitorUp className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.screenRecording')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button
								variant="outline"
								size="xs"
								onClick={handleOpenScreenRecording}
								className="h-6 px-2 text-[11px]"
							>
								{t('settings.application.openScreenRecording')}
							</Button>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<PanelTop className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.menuBar')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch
								checked={trayEnabled}
								onCheckedChange={handleTrayToggle}
								aria-label={t('settings.application.menuBar')}
							/>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<BatteryCharging className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.application.keepAwake')}</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{t('settings.application.keepAwakeDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch
								checked={keepAwakeEnabled}
								disabled={keepAwakeLoading}
								onCheckedChange={handleKeepAwakeToggle}
								aria-label={t('settings.application.keepAwake')}
							/>
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
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<FolderOpen className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.userData')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenUserDataFolder}>
								{t('settings.application.openUserData')}
							</Button>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default GeneralPage;
