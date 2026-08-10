import React, { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bot, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ModelProviderSelect, toModelProviderGroups } from '@/components/model-provider-select';
import { ProviderAvatar } from '@/components/provider-avatar';
import { getProviderCatalogItem } from '../../start/constants';
import { SettingsLoadingRows, SettingsNotice, SettingsRow } from './index';
import type { ModelConfigurationState } from './model-configuration-state';

interface ModelProviderConfigurationProps {
	readonly configState: ModelConfigurationState;
	readonly idPrefix: string;
	readonly description?: ReactNode;
	readonly triggerTitle?: ReactNode;
	readonly triggerDescription?: ReactNode;
	readonly showInlineError?: boolean;
	readonly showIcon?: boolean;
	readonly collapsible?: boolean;
	readonly defaultOpen?: boolean;
	readonly onChange: (nextProviderId: string, nextModelId: string) => void;
	readonly children?: ReactNode;
}

export function ModelProviderConfiguration({
	configState,
	idPrefix,
	description,
	triggerTitle,
	triggerDescription,
	showInlineError = false,
	showIcon = true,
	collapsible = true,
	defaultOpen = false,
	onChange,
	children,
}: ModelProviderConfigurationProps): React.JSX.Element {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const group = configState.modelGroups.find((item) => item.provider.id === configState.providerId);
	const provider = group?.provider;
	const model = group?.models.find((item) => item.id === configState.modelId);
	const providerName = provider
		? getProviderCatalogItem(provider.id).name
		: t('settings.modelServices.providerPlaceholder');
	const modelName = model?.name ?? model?.id ?? t('settings.modelServices.modelUnavailable');

	const configurationBody = configState.loading ? (
		<SettingsLoadingRows rows={2} />
	) : (
		<div className="grid min-w-0 gap-3 px-3 py-3">
			{showInlineError && configState.error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{configState.error}
				</SettingsNotice>
			)}

			<ModelProviderSelect
				idPrefix={idPrefix}
				providerGroups={toModelProviderGroups(configState.modelGroups)}
				providerId={configState.providerId}
				modelId={configState.modelId}
				onChange={onChange}
				disabled={configState.loading || configState.saving || configState.modelGroups.length === 0}
				labels={{
					description,
					placeholder: configState.loadingModels
						? t('settings.modelServices.modelsLoading')
						: undefined,
				}}
			/>

			{children}

			{configState.providers.length === 0 && (
				<p className="text-[11px] leading-4 text-muted-foreground">
					{t('settings.providers.noProviders')}
				</p>
			)}
			{configState.providers.length > 0 && configState.modelGroups.length === 0 && (
				<p className="text-[11px] leading-4 text-muted-foreground">
					{t('settings.modelServices.noModels')}
				</p>
			)}
			{configState.saved && (
				<p className="text-[11px] leading-4 text-muted-foreground">
					{t('settings.modelServices.saved')}
				</p>
			)}
		</div>
	);

	if (!collapsible) {
		const rowTitle = triggerTitle ?? providerName;
		const rowLabel = typeof rowTitle === 'string' ? rowTitle : t('settings.modelServices.model');
		return (
			<>
				{showInlineError && configState.error && (
					<SettingsNotice variant="destructive" icon={AlertTriangle} className="mx-3 mt-3">
						{configState.error}
					</SettingsNotice>
				)}
				<SettingsRow
					title={rowTitle}
					description={triggerDescription ?? description}
					actions={
						<ModelProviderSelect
							inline
							idPrefix={idPrefix}
							providerGroups={toModelProviderGroups(configState.modelGroups)}
							providerId={configState.providerId}
							modelId={configState.modelId}
							onChange={onChange}
							disabled={
								configState.loading || configState.saving || configState.modelGroups.length === 0
							}
							labels={{
								label: rowLabel,
								placeholder: configState.loadingModels
									? t('settings.modelServices.modelsLoading')
									: undefined,
							}}
						/>
					}
				/>
				<div className="px-3 pb-3 empty:hidden">{children}</div>
				{configState.providers.length === 0 && (
					<p className="px-3 pb-2 text-[11px] leading-4 text-muted-foreground">
						{t('settings.providers.noProviders')}
					</p>
				)}
				{configState.providers.length > 0 && configState.modelGroups.length === 0 && (
					<p className="px-3 pb-2 text-[11px] leading-4 text-muted-foreground">
						{t('settings.modelServices.noModels')}
					</p>
				)}
				{configState.saved && (
					<p className="px-3 pb-2 text-[11px] leading-4 text-muted-foreground">
						{t('settings.modelServices.saved')}
					</p>
				)}
			</>
		);
	}

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className="min-w-0 max-w-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
		>
			<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
				{showIcon &&
					(provider ? (
						<ProviderAvatar
							providerId={provider.id}
							name={providerName}
							iconDarkUrl={provider.iconDarkUrl}
							iconLightUrl={provider.iconLightUrl}
							className="size-10"
						/>
					) : (
						<div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
							<Bot className="size-4" aria-hidden="true" />
						</div>
					))}
				<div className="min-w-0 flex-1">
					<div className="truncate text-[13px] font-medium leading-4 text-foreground">
						{triggerTitle ?? providerName}
					</div>
					<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
						{triggerDescription ?? modelName}
					</p>
				</div>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent className="border-t border-border/60">
				{configurationBody}
			</CollapsibleContent>
		</Collapsible>
	);
}
