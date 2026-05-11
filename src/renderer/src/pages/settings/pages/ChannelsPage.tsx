import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, MessageCircleMore, Send, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface ChannelCardDefinition {
	readonly key: 'telegram' | 'discord';
	readonly icon: LucideIcon;
	readonly order: number;
	readonly availabilityKey: 'available' | 'next';
}

const CHANNEL_CARDS: readonly ChannelCardDefinition[] = [
	{ key: 'telegram', icon: Send, order: 1, availabilityKey: 'available' },
	{ key: 'discord', icon: MessageCircleMore, order: 2, availabilityKey: 'next' },
];

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex w-full flex-col gap-5 p-6">
			<section>
				<h2 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.sections.channels')}
				</h2>
				<p className="mb-4 px-2 text-sm text-muted-foreground">
					{t('settings.channels.description')}
				</p>

				<div className="grid gap-4 md:grid-cols-2">
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
											{t('settings.channels.order')}
										</span>
										<span className="text-sm font-medium">{channel.order}</span>
									</div>
									<div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
										<span className="text-xs text-muted-foreground">
											{t('settings.channels.integration')}
										</span>
										<span className="inline-flex items-center gap-2 text-sm font-medium">
											<Bot className="size-4 text-muted-foreground" />
											{t('settings.channels.bot')}
										</span>
									</div>
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
