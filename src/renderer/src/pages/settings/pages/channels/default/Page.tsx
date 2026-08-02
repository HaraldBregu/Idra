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
import type { CatalogService } from '@shared/provider_types';
import { getErrorMessage } from '../../../../start/constants';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell } from '../../../components';

const DefaultChannelPage: React.FC = () => {
	const { t } = useTranslation();
	const [bots, setBots] = useState<CatalogService[] | null>(null);
	const [channelId, setChannelId] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void Promise.all([window.app.bots(), window.app.getChannels()]).then(
			([services, config]) => {
				if (cancelled) return;
				setBots(services);
				setChannelId(config.channelId ?? '');
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.channels.errors.load')));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [t]);

	const selectChannel = async (service: CatalogService): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			await window.app.setDefaultChannel(service.provider.id, service.id);
			setChannelId(service.id);
		} catch (err) {
			setError(getErrorMessage(err, t('settings.channels.errors.saveDefault')));
		} finally {
			setSaving(false);
		}
	};

	const selected = bots?.find((service) => service.id === channelId);

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

			{bots && (
				<Card size="sm" className="gap-0! py-0!">
					<Collapsible>
						<CollapsibleTrigger className="group w-full text-left">
							<CardHeader className="py-3">
								<CardTitle className="flex items-center justify-between">
									{selected?.provider.name ?? t('settings.channels.defaultPlaceholder')}
									<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
								</CardTitle>
								<CardDescription className="text-xs">
									{selected?.name ?? t('settings.channels.defaultDescription')}
								</CardDescription>
							</CardHeader>
						</CollapsibleTrigger>
						<CollapsibleContent className="border-t border-border/60">
							<div className="grid gap-3 px-3 py-3">
								<Select
									value={channelId || null}
									onValueChange={(value: string | null) => {
										const service = bots.find((entry) => entry.id === value);
										if (service) void selectChannel(service);
									}}
									disabled={saving}
								>
									<SelectTrigger
										size="sm"
										className="w-full text-xs [&_svg]:size-3"
										aria-label={t('settings.channels.defaultTitle')}
									>
										<SelectValue>
											{selected?.name ?? t('settings.channels.defaultPlaceholder')}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{bots.map((service) => (
											<SelectItem key={service.id} value={service.id}>
												{service.name}
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
