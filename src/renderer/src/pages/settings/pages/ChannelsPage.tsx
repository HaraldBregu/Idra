import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Bot,
	MessageCircleMore,
	Phone,
	Plus,
	RadioTower,
	Send,
	ShieldCheck,
	X,
	type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChannelConnectionStatus } from '../../../../../shared/channels';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from '../components';

interface ChannelCardDefinition {
	readonly key: 'telegram' | 'discord';
	readonly icon: LucideIcon;
	readonly availabilityKey: 'available' | 'next';
}

const CHANNEL_CARDS: readonly ChannelCardDefinition[] = [
	{ key: 'telegram', icon: Send, availabilityKey: 'available' },
	{ key: 'discord', icon: MessageCircleMore, availabilityKey: 'next' },
];

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();
	const [telegramToken, setTelegramToken] = useState('');
	const [phoneNumberDraft, setPhoneNumberDraft] = useState('');
	const [allowedPhoneNumbers, setAllowedPhoneNumbers] = useState<readonly string[]>([]);
	const [telegramStatus, setTelegramStatus] = useState<ChannelConnectionStatus>('disconnected');
	const [telegramBusy, setTelegramBusy] = useState(false);
	const [telegramError, setTelegramError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		window.channels
			.getTelegramConfig()
			.then((config) => {
				if (!mounted) return;
				setTelegramToken(config.token);
				setAllowedPhoneNumbers(config.allowFrom);
			})
			.catch((error) => {
				console.error('[ChannelsPage] Failed to load telegram config:', error);
				if (mounted) setTelegramError(error instanceof Error ? error.message : String(error));
			});

		window.channels
			.getTelegramStatus()
			.then((status) => {
				if (!mounted || !status) return;
				setTelegramStatus(status.status);
				setTelegramError(status.error ?? null);
			})
			.catch((error) => {
				console.error('[ChannelsPage] Failed to load telegram status:', error);
				if (mounted) setTelegramError(error instanceof Error ? error.message : String(error));
			});

		const unsubscribe = window.channels.onStatusChanged((event) => {
			if (event.type !== 'telegram') return;
			setTelegramStatus(event.status);
			setTelegramError(event.error ?? null);
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	}, []);

	const saveTelegramConfig = async (
		token = telegramToken,
		allowFrom = allowedPhoneNumbers
	): Promise<void> => {
		setTelegramBusy(true);
		setTelegramError(null);
		try {
			const config = await window.channels.saveTelegramConfig({
				token,
				allowFrom: [...allowFrom],
			});
			setTelegramToken(config.token);
			setAllowedPhoneNumbers(config.allowFrom);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			setTelegramError(message);
			throw error;
		} finally {
			setTelegramBusy(false);
		}
	};

	const addAllowedPhoneNumber = (): void => {
		const next = phoneNumberDraft.trim();
		if (!next || allowedPhoneNumbers.includes(next)) return;
		const updated = [...allowedPhoneNumbers, next];
		setAllowedPhoneNumbers(updated);
		setPhoneNumberDraft('');
		void saveTelegramConfig(telegramToken, updated);
	};

	const removeAllowedPhoneNumber = (phoneNumber: string): void => {
		const updated = allowedPhoneNumbers.filter((item) => item !== phoneNumber);
		setAllowedPhoneNumbers(updated);
		void saveTelegramConfig(telegramToken, updated);
	};

	const handleTelegramTokenBlur = (): void => {
		void saveTelegramConfig();
	};

	const handleStartTelegram = async (): Promise<void> => {
		setTelegramBusy(true);
		setTelegramError(null);
		try {
			await saveTelegramConfig();
			const status = await window.channels.startTelegram();
			if (status) {
				setTelegramStatus(status.status);
				setTelegramError(status.error ?? null);
			}
		} catch (error) {
			setTelegramError(error instanceof Error ? error.message : String(error));
		} finally {
			setTelegramBusy(false);
		}
	};

	const handleRestartTelegram = async (): Promise<void> => {
		setTelegramBusy(true);
		setTelegramError(null);
		try {
			await saveTelegramConfig();
			const status = await window.channels.restartTelegram();
			if (status) {
				setTelegramStatus(status.status);
				setTelegramError(status.error ?? null);
			}
		} catch (error) {
			setTelegramError(error instanceof Error ? error.message : String(error));
		} finally {
			setTelegramBusy(false);
		}
	};

	const handleStopTelegram = async (): Promise<void> => {
		setTelegramBusy(true);
		setTelegramError(null);
		try {
			await window.channels.stopTelegram();
			setTelegramStatus('disconnected');
		} catch (error) {
			setTelegramError(error instanceof Error ? error.message : String(error));
		} finally {
			setTelegramBusy(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				icon={RadioTower}
				title={t('settings.tabs.channels')}
				description={t('settings.channels.description')}
			/>

			<SettingsSection title={t('settings.sections.channels')}>
				<div className="grid gap-4">
					{CHANNEL_CARDS.map((channel) => {
						const Icon = channel.icon;

						return (
							<SettingsPanel key={channel.key}>
								<div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
									<div className="flex min-w-0 items-center gap-3">
										<div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
											<Icon className="size-4 text-foreground" />
										</div>
										<div className="min-w-0">
											<h3 className="text-sm font-semibold">{t(`channels.${channel.key}`)}</h3>
											<p className="mt-1 text-xs leading-normal text-muted-foreground">
												{t(`channels.${channel.key}Description`)}
											</p>
										</div>
									</div>
									<Badge
										variant={channel.availabilityKey === 'available' ? 'secondary' : 'outline'}
									>
										{t(`settings.channels.${channel.availabilityKey}`)}
									</Badge>
								</div>

								<SettingsRow icon={Bot} title={t('settings.channels.integration')}>
									<SettingsValue>
										<Bot className="mr-1.5 size-3.5" />
										{t('settings.channels.bot')}
									</SettingsValue>
								</SettingsRow>

								{channel.key === 'telegram' && (
									<>
										<SettingsRow
											icon={ShieldCheck}
											title={t('settings.channels.token')}
											description={t('settings.channels.tokenDescription')}
											actionClassName="w-full sm:w-auto sm:flex-nowrap"
										>
											<div className="flex w-full min-w-0 flex-col gap-2 sm:w-[420px] sm:flex-row">
												<Input
													type="password"
													value={telegramToken}
													onChange={(event) => setTelegramToken(event.target.value)}
													onBlur={handleTelegramTokenBlur}
													placeholder={t('settings.channels.telegramTokenPlaceholder')}
													className="min-w-0 text-sm"
													aria-label={t('settings.channels.token')}
												/>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={telegramBusy}
													onClick={() => void saveTelegramConfig()}
												>
													{t('common.save')}
												</Button>
											</div>
										</SettingsRow>

										<SettingsRow
											icon={Phone}
											title={t('settings.channels.allowFrom')}
											description={t('settings.channels.phoneNumberDescription')}
											actionClassName="w-full sm:w-auto"
										>
											<div className="flex w-full min-w-0 flex-col gap-2 sm:w-[420px]">
												<div className="flex min-w-0 items-center gap-2">
													<Input
														type="tel"
														value={phoneNumberDraft}
														onChange={(event) => setPhoneNumberDraft(event.target.value)}
														onKeyDown={(event) => {
															if (event.key === 'Enter') {
																event.preventDefault();
																addAllowedPhoneNumber();
															}
														}}
														placeholder={t('settings.channels.phoneNumberPlaceholder')}
														className="min-w-0 text-sm"
														aria-label={t('settings.channels.phoneNumber')}
													/>
													<Button
														type="button"
														variant="outline"
														size="icon-sm"
														onClick={addAllowedPhoneNumber}
														aria-label={t('settings.channels.addPhoneNumber')}
														title={t('settings.channels.addPhoneNumber')}
													>
														<Plus className="size-3.5" />
													</Button>
												</div>
												<div className="flex flex-wrap gap-2">
													{allowedPhoneNumbers.length > 0 ? (
														allowedPhoneNumbers.map((phoneNumber) => (
															<Badge key={phoneNumber} variant="outline" className="gap-1.5 pr-1">
																{phoneNumber}
																<button
																	type="button"
																	onClick={() => removeAllowedPhoneNumber(phoneNumber)}
																	className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
																	aria-label={t('settings.channels.removePhoneNumber', {
																		phoneNumber,
																	})}
																>
																	<X className="size-3" />
																</button>
															</Badge>
														))
													) : (
														<span className="text-xs text-muted-foreground">
															{t('settings.channels.noAllowedPhoneNumbers')}
														</span>
													)}
												</div>
											</div>
										</SettingsRow>

										<SettingsRow
											icon={RadioTower}
											title={t('settings.channels.status')}
											description={t(`channels.status.${telegramStatus}`)}
										>
											<div className="flex flex-wrap items-center gap-2">
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={telegramBusy || !telegramToken.trim()}
													onClick={() => void handleStartTelegram()}
												>
													{t('settings.channels.pair')}
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={telegramBusy || !telegramToken.trim()}
													onClick={() => void handleRestartTelegram()}
												>
													{t('settings.channels.reconnect')}
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={telegramBusy}
													onClick={() => void handleStopTelegram()}
												>
													{t('common.close')}
												</Button>
											</div>
										</SettingsRow>

										{telegramError && (
											<div className="border-t border-border/70 px-4 py-3">
												<SettingsNotice variant="destructive">{telegramError}</SettingsNotice>
											</div>
										)}
									</>
								)}
							</SettingsPanel>
						);
					})}
				</div>
			</SettingsSection>

			<SettingsNotice>{t('settings.channels.moreSoon')}</SettingsNotice>
		</SettingsPageShell>
	);
};

export default ChannelsPage;
