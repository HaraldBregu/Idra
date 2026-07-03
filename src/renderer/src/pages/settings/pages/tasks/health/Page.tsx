import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
} from '../../../components';

type HealthSettings = Awaited<ReturnType<typeof window.agent.healthGetSettings>>;

function formatValue(value: unknown): string {
	if (typeof value === 'boolean') return value ? 'On' : 'Off';
	if (value && typeof value === 'object') {
		const hours = value as { start: string; end: string };
		return `${hours.start} – ${hours.end}`;
	}
	return String(value);
}

const HealthPage: React.FC = () => {
	const { t } = useTranslation();
	const [settings, setSettings] = useState<HealthSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void window.agent
			.healthGetSettings()
			.then((result) => {
				if (mounted) setSettings(result);
			})
			.catch((err: unknown) => {
				if (mounted) setError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.health')}
				description={t('settings.overview.descriptions.health')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsPanel>
				{loading ? (
					<SettingsLoadingRows rows={3} />
				) : (
					settings &&
					Object.entries(settings).map(([key, value]) => (
						<Item
							key={key}
							variant="outline"
							size="md"
							className="border-b border-border/60 last:border-b-0"
						>
							<ItemContent className="min-w-0 flex-1">
								<ItemTitle className="max-w-full truncate">{key}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="text-[11px] leading-4 text-muted-foreground">
									{formatValue(value)}
								</span>
							</ItemActions>
						</Item>
					))
				)}
			</SettingsPanel>
		</SettingsPageShell>
	);
};

export default HealthPage;
