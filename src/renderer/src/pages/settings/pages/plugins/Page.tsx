import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Puzzle, RefreshCw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PluginSummary } from '../../../../../../shared/plugin_types';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

const PluginsPage: React.FC = () => {
	const { t } = useTranslation();
	const [plugins, setPlugins] = useState<PluginSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [installing, setInstalling] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

	const loadPlugins = useCallback(async (): Promise<void> => {
		setLoading(true);
		setErrorMessage('');
		try {
			setPlugins(await window.plugins.list());
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.plugins.loadError')));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void loadPlugins();
	}, [loadPlugins]);

	const handleInstall = useCallback(async (): Promise<void> => {
		setInstalling(true);
		setErrorMessage('');
		setSuccessMessage('');
		try {
			const result = await window.plugins.install();
			if (result) {
				setSuccessMessage(
					t('settings.plugins.uploaded', {
						count: String(result.installed.length),
						skipped: String(result.skipped.length),
					})
				);
				if (result.skipped.length > 0) {
					setErrorMessage(
						result.skipped
							.map((item) => `${item.name}: ${item.reason}`)
							.join('\n')
					);
				}
				await loadPlugins();
			}
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.plugins.uploadError')));
		} finally {
			setInstalling(false);
		}
	}, [loadPlugins, t]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.plugins')}
				description={t('settings.plugins.description')}
				action={
					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="xs"
							onClick={loadPlugins}
							disabled={loading || installing}
						>
							<RefreshCw className="size-3" />
							{t('settings.plugins.refresh')}
						</Button>
						<Button size="xs" onClick={() => void handleInstall()} disabled={loading || installing}>
							<Upload className="size-3" />
							{installing ? t('settings.plugins.uploading') : t('settings.plugins.upload')}
						</Button>
					</div>
				}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			{successMessage && <SettingsNotice>{successMessage}</SettingsNotice>}

			<SettingsSection title={t('settings.plugins.title')}>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : plugins.length === 0 ? (
						<SettingsEmptyState
							icon={Puzzle}
							title={t('settings.plugins.empty')}
							description={t('settings.plugins.emptyDescription')}
						/>
					) : (
						plugins.map((plugin) => (
							<Item
								key={plugin.id}
								variant="outline"
								size="md"
								className="border-b border-border/60 last:border-b-0"
							>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
									<ItemTitle className="max-w-full truncate">{plugin.name}</ItemTitle>
									<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground">
										{plugin.description}
									</p>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end gap-2">
									<Badge variant="outline">
										{t('settings.plugins.contributions', {
											count: String(plugin.contributions),
										})}
									</Badge>
									<Badge variant="secondary">v{plugin.version}</Badge>
								</ItemActions>
							</Item>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default PluginsPage;
