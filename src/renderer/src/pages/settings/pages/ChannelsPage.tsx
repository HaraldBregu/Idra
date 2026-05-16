import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	MessageCircleMore,
	Phone,
	Plus,
	RadioTower,
	Send,
	ShieldCheck,
	X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../components';
import type { ChannelConnectionStatus } from '../../../../../shared/channels';

interface ChannelCardDefinition {
	readonly key: 'telegram' | 'discord';
	readonly icon: typeof Send;
	readonly availabilityKey: 'available' | 'next';
}

const CHANNEL_CARDS: readonly ChannelCardDefinition[] = [
	{ key: 'telegram', icon: Send, availabilityKey: 'available' },
	{ key: 'discord', icon: MessageCircleMore, availabilityKey: 'next' },
];

function getConnectionBadgeVariant(
	status: ChannelConnectionStatus
): 'secondary' | 'destructive' | 'outline' {
	if (status === 'connected') return 'secondary';
	if (status === 'error') return 'destructive';
	return 'outline';
}

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
			<SettingsPageHeader title={t('settings.tabs.channels')} description={t('settings.channels.description')} />

			<SettingsSection title={t('settings.sections.channels')}>
				<div className="grid gap-2">
					{CHANNEL_CARDS.map((channel) => {
						const Icon = channel.icon;

						return (
							<SettingsPanel key={channel.key}>
								<SettingsRow
									icon={Icon}
									title={t(`channels.${channel.key}`)}
									description={t(`channels.${channel.key}Description`)}
									actions={
										<Badge
											variant={channel.availabilityKey === 'available' ? 'secondary' : 'outline'}
											className="h-5 shrink-0 px-2 text-xs"
										>
											{t(`settings.channels.${channel.availabilityKey}`)}
										</Badge>
									}
								/>

								{channel.key === 'telegram' && (
									<>
										<SettingsRow
											icon={ShieldCheck}
											title={t('settings.channels.token')}
											description={t('settings.channels.tokenDescription')}
											actions={
												<InputGroup className="h-9 w-full sm:w-96">
													<InputGroupInput
														id="telegram-token"
														type="password"
														value={telegramToken}
														onChange={(event) => setTelegramToken(event.target.value)}
														onBlur={handleTelegramTokenBlur}
														placeholder={t('settings.channels.telegramTokenPlaceholder')}
														className="h-9 min-w-0 px-3 text-sm md:text-sm"
														aria-label={t('settings.channels.token')}
													/>
													<InputGroupAddon align="inline-end" className="py-0 pr-1">
														<InputGroupButton
															type="button"
															disabled={telegramBusy}
															onClick={() => void saveTelegramConfig()}
														>
															{t('common.save')}
														</InputGroupButton>
													</InputGroupAddon>
												</InputGroup>
											}
										/>

										<SettingsRow
											icon={Phone}
											title={t('settings.channels.allowFrom')}
											description={t('settings.channels.phoneNumberDescription')}
											actions={
												<div className="flex w-full min-w-0 flex-col gap-2 sm:w-96">
													<InputGroup className="h-9">
														<InputGroupInput
															id="telegram-phone-number"
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
															className="h-9 min-w-0 px-3 text-sm md:text-sm"
															aria-label={t('settings.channels.phoneNumber')}
														/>
														<InputGroupAddon align="inline-end" className="py-0 pr-1">
															<InputGroupButton
															type="button"
															size="icon-xs"
															onClick={addAllowedPhoneNumber}
															aria-label={t('settings.channels.addPhoneNumber')}
															title={t('settings.channels.addPhoneNumber')}
														>
															<Plus className="size-3" />
															</InputGroupButton>
														</InputGroupAddon>
													</InputGroup>
													<div className="flex min-h-6 flex-wrap items-center gap-1.5">
														{allowedPhoneNumbers.length > 0 ? (
															allowedPhoneNumbers.map((phoneNumber) => (
																<Badge
																	key={phoneNumber}
																	variant="outline"
																	className="h-5 max-w-full gap-1 pr-1 text-xs"
																>
																	<span className="max-w-48 truncate">{phoneNumber}</span>
																	<button
																		type="button"
																		onClick={() => removeAllowedPhoneNumber(phoneNumber)}
																		className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
																		aria-label={t('settings.channels.removePhoneNumber', {
																			phoneNumber,
																		})}
																	>
																		<X className="size-2.5" />
																	</button>
																</Badge>
															))
														) : (
															<span className="text-[11px] text-muted-foreground">
																{t('settings.channels.noAllowedPhoneNumbers')}
															</span>
														)}
													</div>
												</div>
											}
										/>

										<SettingsRow
											icon={RadioTower}
											title={t('settings.channels.status')}
											description={t(`channels.status.${telegramStatus}`)}
											actions={
												<div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
													<Badge
														variant={getConnectionBadgeVariant(telegramStatus)}
														className="h-6 text-xs capitalize"
													>
														{telegramStatus.replaceAll('_', ' ')}
													</Badge>
													<ButtonGroup>
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
													</ButtonGroup>
												</div>
											}
										/>

										{telegramError && <SettingsNotice variant="destructive">{telegramError}</SettingsNotice>}
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
