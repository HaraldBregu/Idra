import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Blocks, ChevronRight, RefreshCw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { Extension } from '../../../../../../shared/extension_types';
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

const ExtensionsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [extensions, setExtensions] = useState<Extension[]>([]);
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

	const loadExtensions = useCallback(async (): Promise<void> => {
		setLoading(true);
		setErrorMessage('');
		try {
			setExtensions(await window.extensions.list());
		} catch {
			setErrorMessage(t('settings.extensions.loadError'));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void loadExtensions();
	}, [loadExtensions]);

	const handleImport = useCallback(async (): Promise<void> => {
		setImporting(true);
		setErrorMessage('');
		setSuccessMessage('');
		try {
			const result = await window.extensions.import();
			if (result) {
				setSuccessMessage(
					t('settings.extensions.uploaded', {
						count: String(result.imported.length),
						skipped: String(result.skipped.length),
					})
				);
				await loadExtensions();
			}
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.extensions.uploadError')));
		} finally {
			setImporting(false);
		}
	}, [loadExtensions, t]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.extensions')}
				description={t('settings.extensions.description')}
				action={
					<Button variant="outline" size="xs" onClick={loadExtensions} disabled={loading}>
						<RefreshCw className="size-3" />
						{t('settings.extensions.refresh')}
					</Button>
				}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.extensions.title')}>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : extensions.length === 0 ? (
						<SettingsEmptyState
							icon={Blocks}
							title={t('settings.extensions.empty')}
							description={t('settings.extensions.emptyDescription')}
						/>
					) : (
						extensions.map((extension) => (
							<Item
								key={extension.id}
								role="button"
								tabIndex={0}
								variant="outline"
								size="md"
								className="cursor-pointer border-b border-border/60 hover:bg-muted/40 last:border-b-0"
								onClick={() =>
									navigate(
										`/settings/extensions/extensiondetails/${encodeURIComponent(extension.id)}`
									)
								}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										navigate(
											`/settings/extensions/extensiondetails/${encodeURIComponent(extension.id)}`
										);
									}
								}}
							>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
									<ItemTitle className="max-w-full truncate">{extension.title}</ItemTitle>
									<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground">
										{extension.description}
									</p>
								</ItemContent>
								<ItemActions className="ml-auto flex-none items-center justify-end gap-2">
									<Badge variant="secondary" className="text-[10px] leading-none">
										{extension.metadata.category}
									</Badge>
									<ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
								</ItemActions>
							</Item>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ExtensionsPage;
