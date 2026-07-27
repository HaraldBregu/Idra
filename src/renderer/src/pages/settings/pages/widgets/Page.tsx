import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, LayoutGrid, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { Widget } from '../../../../../../shared/widget_types';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const WidgetsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [widgets, setWidgets] = useState<Widget[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');

	const loadWidgets = useCallback(async (): Promise<void> => {
		setLoading(true);
		setErrorMessage('');
		try {
			setWidgets(await window.widgets.list());
		} catch {
			setErrorMessage(t('settings.widgets.loadError'));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void loadWidgets();
	}, [loadWidgets]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.widgets')}
				description={t('settings.widgets.description')}
				action={
					<Button variant="outline" size="xs" onClick={loadWidgets} disabled={loading}>
						<RefreshCw className="size-3" />
						{t('settings.widgets.refresh')}
					</Button>
				}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.widgets.title')}>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : widgets.length === 0 ? (
						<SettingsEmptyState
							icon={LayoutGrid}
							title={t('settings.widgets.empty')}
							description={t('settings.widgets.emptyDescription')}
						/>
					) : (
						widgets.map((widget) => (
							<Item
								key={widget.id}
								role="button"
								tabIndex={0}
								variant="outline"
								size="md"
								className="cursor-pointer border-b border-border/60 hover:bg-muted/40 last:border-b-0"
								onClick={() => navigate(`/settings/widgets/widgetdetails/${encodeURIComponent(widget.id)}`)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										navigate(`/settings/widgets/widgetdetails/${encodeURIComponent(widget.id)}`);
									}
								}}
							>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
									<ItemTitle className="max-w-full truncate">{widget.title}</ItemTitle>
									<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground">
										{widget.description}
									</p>
								</ItemContent>
								<ItemActions className="ml-auto flex-none items-center justify-end gap-2">
									<Badge variant="secondary" className="text-[10px] leading-none">
										{widget.metadata.category}
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

export default WidgetsPage;
