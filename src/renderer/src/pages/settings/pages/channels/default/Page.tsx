import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { ChannelType } from '../../../../../../../shared';
import { getErrorMessage } from '../../../../start/constants';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell } from '../../../components';
import { channelList, type ChannelListEntry } from '../list';

const DefaultChannelPage: React.FC = () => {
	const { t } = useTranslation();
	const [channels, setChannels] = useState<ChannelListEntry[] | null>(null);
	const [defaultChannel, setDefaultChannel] = useState<ChannelType | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void window.app.getChannels().then(
			(config) => {
				if (cancelled) return;
				setChannels(channelList(config));
				setDefaultChannel(config.defaultChannel ?? null);
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.channels.errors.load')));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [t]);

	const selectChannel = async (channel: ChannelType): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			setDefaultChannel(await window.app.setDefaultChannel(channel));
		} catch (err) {
			setError(getErrorMessage(err, t('settings.channels.errors.saveDefault')));
		} finally {
			setSaving(false);
		}
	};

	const selected = channels?.find((channel) => channel.id === defaultChannel);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.channels.defaultTitle')}
				description={t('settings.channels.defaultDescription')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			{channels && (
				<Card size="sm" className="gap-0! py-0!">
					<Collapsible>
						<CollapsibleTrigger className="group w-full text-left">
							<CardHeader className="py-3">
								<CardTitle className="flex items-center justify-between">
									{selected?.label ?? t('settings.channels.defaultPlaceholder')}
									<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
								</CardTitle>
								<CardDescription className="text-xs">
									{t('settings.channels.defaultDescription')}
								</CardDescription>
							</CardHeader>
						</CollapsibleTrigger>
						<CollapsibleContent className="border-t border-border/60">
							<div className="grid gap-3 px-3 py-3">
								<Select
									value={defaultChannel}
									onValueChange={(value: string | null) =>
										value === null ? undefined : void selectChannel(value as ChannelType)
									}
									disabled={saving}
								>
									<SelectTrigger
										size="sm"
										className="w-full text-xs [&_svg]:size-3"
										aria-label={t('settings.channels.defaultTitle')}
									>
										<SelectValue>
											{selected?.label ?? t('settings.channels.defaultPlaceholder')}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{channels.map((channel) => (
											<SelectItem key={channel.id} value={channel.id}>
												{channel.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</Card>
			)}
		</SettingsPageShell>
	);
};

export default DefaultChannelPage;
