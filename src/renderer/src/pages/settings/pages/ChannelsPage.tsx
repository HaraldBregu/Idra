import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, MessageCircleMore, Plus, Send, X, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

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

	const addAllowedPhoneNumber = (): void => {
		const next = phoneNumberDraft.trim();
		if (!next || allowedPhoneNumbers.includes(next)) return;
		setAllowedPhoneNumbers((current) => [...current, next]);
		setPhoneNumberDraft('');
	};

	const removeAllowedPhoneNumber = (phoneNumber: string): void => {
		setAllowedPhoneNumbers((current) => current.filter((item) => item !== phoneNumber));
	};

	return (
		<div className="flex w-full flex-col gap-5 p-6">
			<section>
				<h2 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.sections.channels')}
				</h2>
				<p className="mb-4 px-2 text-sm text-muted-foreground">
					{t('settings.channels.description')}
				</p>

				<div className="grid gap-4">
					{CHANNEL_CARDS.map((channel) => {
						const Icon = channel.icon;

						return (
							<Card key={channel.key} className="gap-0 py-0">
								<CardHeader className="gap-3 border-b border-border/70 py-4">
									<div className="flex items-start justify-between gap-3">
										<div className="flex min-w-0 items-center gap-3">
											<div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
												<Icon className="size-4 text-foreground" />
											</div>
											<div className="min-w-0">
												<CardTitle>{t(`channels.${channel.key}`)}</CardTitle>
												<CardDescription className="mt-1">
													{t(`channels.${channel.key}Description`)}
												</CardDescription>
											</div>
										</div>
										<Badge variant="outline">
											{t(`settings.channels.${channel.availabilityKey}`)}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="flex flex-col gap-3 py-4">
									<div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
										<span className="text-xs text-muted-foreground">
											{t('settings.channels.integration')}
										</span>
										<span className="inline-flex items-center gap-2 text-sm font-medium">
											<Bot className="size-4 text-muted-foreground" />
											{t('settings.channels.bot')}
										</span>
									</div>
									{channel.key === 'telegram' && (
										<>
											<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
												<div className="min-w-0">
													<p className="text-xs font-medium text-foreground">
														{t('settings.channels.token')}
													</p>
													<p className="text-xs text-muted-foreground">
														{t('settings.channels.tokenDescription')}
													</p>
												</div>
												<Input
													type="password"
													value={telegramToken}
													onChange={(event) => setTelegramToken(event.target.value)}
													placeholder={t('settings.channels.telegramTokenPlaceholder')}
													className="max-w-sm text-sm"
													aria-label={t('settings.channels.token')}
												/>
											</div>

											<div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
												<div className="flex flex-wrap items-start justify-between gap-3">
													<div className="min-w-0">
														<p className="text-xs font-medium text-foreground">
															{t('settings.channels.allowFrom')}
														</p>
														<p className="text-xs text-muted-foreground">
															{t('settings.channels.phoneNumberDescription')}
														</p>
													</div>
													<div className="flex min-w-[260px] max-w-sm flex-1 items-center gap-2">
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
															className="text-sm"
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
												</div>

												<div className="flex flex-wrap gap-2">
													{allowedPhoneNumbers.length > 0 ? (
														allowedPhoneNumbers.map((phoneNumber) => (
															<Badge
																key={phoneNumber}
																variant="outline"
																className="gap-1.5 pr-1"
															>
																{phoneNumber}
																<button
																	type="button"
																	onClick={() => removeAllowedPhoneNumber(phoneNumber)}
																	className="rounded-sm text-muted-foreground hover:text-foreground"
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
										</>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</section>

			<p className="px-2 text-xs text-muted-foreground">{t('settings.channels.moreSoon')}</p>
		</div>
	);
};

export default ChannelsPage;
