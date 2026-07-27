import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, LayoutGrid } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { Widget } from '../../../../../../../shared/widget_types';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';

const KNOWN_METADATA_KEYS = ['version', 'category', 'entry'];

const WidgetDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const { widgetId } = useParams<{ widgetId: string }>();
	const decodedWidgetId = decodeURIComponent(widgetId ?? '');
	const [widget, setWidget] = useState<Widget | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');
	const loadErrorFallback = t('settings.widgets.loadError');

	const loadWidget = useCallback(async (): Promise<void> => {
		setLoading(true);
		setErrorMessage('');
		try {
			const list = await window.widgets.list();
			setWidget(list.find((item) => item.id === decodedWidgetId) ?? null);
		} catch {
			setErrorMessage(loadErrorFallback);
			setWidget(null);
		} finally {
			setLoading(false);
		}
	}, [decodedWidgetId, loadErrorFallback]);

	useEffect(() => {
		void loadWidget();
	}, [loadWidget]);

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.widgets.details')} />
				<SettingsPanel>
					<SettingsLoadingRows rows={3} />
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	if (!widget) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.widgets.details')} />
				{errorMessage && (
					<SettingsNotice variant="destructive" icon={AlertTriangle}>
						{errorMessage}
					</SettingsNotice>
				)}
				<SettingsPanel>
					<SettingsEmptyState
						icon={LayoutGrid}
						title={decodedWidgetId || t('settings.widgets.empty')}
						description={t('settings.widgets.emptyDescription')}
						className="min-h-28"
					/>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	const extraMetadata = Object.entries(widget.metadata).filter(
		([key]) => !KNOWN_METADATA_KEYS.includes(key)
	);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={widget.title} description={widget.description} />

			<SettingsSection title={t('settings.widgets.details')}>
				<SettingsPanel>
					<WidgetDetail label={t('settings.widgets.detailId')} value={widget.id} mono />
					<WidgetDetail
						label={t('settings.widgets.detailVersion')}
						value={widget.metadata.version}
					/>
					<WidgetDetail
						label={t('settings.widgets.detailCategory')}
						value={widget.metadata.category}
					/>
					<WidgetDetail label={t('settings.widgets.detailEntry')} value={widget.metadata.entry} mono />
					{extraMetadata.map(([key, value]) => (
						<WidgetDetail
							key={key}
							label={key}
							value={typeof value === 'string' ? value : JSON.stringify(value)}
						/>
					))}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

function WidgetDetail({
	label,
	value,
	mono,
}: {
	readonly label: string;
	readonly value: string;
	readonly mono?: boolean;
}): React.JSX.Element {
	return (
		<Item variant="outline" size="md" className="border-b border-border/60 last:border-b-0">
			<ItemContent className="min-w-0">
				<ItemTitle>{label}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto min-w-0 flex-none justify-end">
				<span
					className={
						mono
							? 'max-w-md break-all text-right font-mono text-[11px] text-foreground'
							: 'max-w-md break-words text-right text-xs text-foreground'
					}
				>
					{value}
				</span>
			</ItemActions>
		</Item>
	);
}

export default WidgetDetailsPage;
