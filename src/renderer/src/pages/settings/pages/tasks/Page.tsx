import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, ListChecks } from 'lucide-react';
import type { Model } from '@/lib/compat';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	firstModelIdForProvider,
	LLM_PROVIDER_GROUPS,
	ModelProviderSelect,
	resolveStoredModelProvider,
} from '@/components/model-provider-select';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

type Task = Awaited<ReturnType<typeof window.agent.cronList>>[number];

function describeAction(task: Task): string {
	return task.action.type === 'agent' ? task.action.prompt : task.action.message;
}

const TasksPage: React.FC = () => {
	const { t } = useTranslation();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [providerId, setProviderId] = useState('');
	const [modelId, setModelId] = useState('');
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [runtimeError, setRuntimeError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void Promise.all([window.agent.cronList(), window.agent.cronGetRuntime()])
			.then(([list, runtime]) => {
				if (!mounted) return;
				setTasks(list);
				const resolved = resolveStoredModelProvider(
					LLM_PROVIDER_GROUPS,
					runtime?.providerId,
					runtime?.modelId
				);
				setProviderId(resolved.providerId);
				setModelId(resolved.modelId);
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

	const handleProviderChange = (nextProviderId: string): void => {
		setProviderId(nextProviderId);
		setModelId(firstModelIdForProvider(LLM_PROVIDER_GROUPS, nextProviderId));
		setSaved(false);
		setRuntimeError(null);
	};

	const handleModelChange = (nextModelId: string): void => {
		setModelId(nextModelId);
		setSaved(false);
		setRuntimeError(null);
	};

	const handleSave = async (): Promise<void> => {
		if (!providerId || !modelId) return;
		setSaving(true);
		setSaved(false);
		setRuntimeError(null);
		try {
			await window.agent.cronSetRuntime(providerId, modelId);
			setSaved(true);
		} catch (err) {
			setRuntimeError(
				err instanceof Error ? err.message : t('settings.cron.runtime.errors.saveFailed')
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.taskScheduler')}
				description={t('settings.cron.description')}
			/>

			<SettingsSection
				title={t('settings.cron.runtime.title')}
				description={t('settings.cron.runtime.description')}
			>
				<Collapsible className="rounded-lg border border-border/70 bg-card">
					<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
						<div className="min-w-0 flex-1">
							<div className="truncate text-[13px] font-medium leading-4 text-foreground">
								{selectedGroup
									? getProviderCatalogItem(selectedGroup.id).name
									: t('settings.cron.runtime.providerPlaceholder')}
							</div>
							<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
								{selectedModel?.name ?? selectedModel?.id ?? t('settings.cron.runtime.modelPlaceholder')}
							</p>
						</div>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
					</CollapsibleTrigger>
					<CollapsibleContent className="border-t border-border/60">
					{loading ? (
						<SettingsLoadingRows rows={1} />
					) : PROVIDER_GROUPS.length === 0 ? (
						<SettingsEmptyState
							icon={AlertTriangle}
							title={t('settings.cron.runtime.noProviders')}
						/>
					) : (
						<div className="grid gap-3 px-3 py-3">
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField
									id="task-runtime-provider"
									label={t('settings.cron.runtime.provider')}
								>
									<Select value={providerId} onValueChange={handleProviderChange} disabled={saving}>
										<SelectTrigger id="task-runtime-provider" className="w-full text-xs">
											<SelectValue placeholder={t('settings.cron.runtime.providerPlaceholder')} />
										</SelectTrigger>
										<SelectContent>
											{PROVIDER_GROUPS.map((group) => (
												<SelectItem key={group.id} value={group.id}>
													{getProviderCatalogItem(group.id).name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField id="task-runtime-model" label={t('settings.cron.runtime.model')}>
									<Select
										value={modelId}
										onValueChange={handleModelChange}
										disabled={saving || !selectedGroup || selectedGroup.models.length === 0}
									>
										<SelectTrigger id="task-runtime-model" className="w-full text-xs">
											<SelectValue placeholder={t('settings.cron.runtime.modelPlaceholder')} />
										</SelectTrigger>
										<SelectContent>
											{selectedGroup?.models.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name || model.id}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>
							</div>

							{runtimeError && (
								<p className="text-[11px] leading-4 text-destructive">{runtimeError}</p>
							)}
							{saved && (
								<p className="text-[11px] leading-4 text-muted-foreground">
									{t('settings.cron.runtime.saved')}
								</p>
							)}

							<div className="flex justify-end">
								<Button
									type="button"
									size="sm"
									disabled={saving || !providerId || !modelId}
									onClick={() => void handleSave()}
								>
									{saving ? (
										<LoaderCircle className="size-3 animate-spin" />
									) : (
										<Save className="size-3" />
									)}
									{saving ? t('settings.cron.runtime.saving') : t('common.save')}
								</Button>
							</div>
						</div>
					)}
					</CollapsibleContent>
				</Collapsible>
			</SettingsSection>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.cron.schedulesTitle')}
				description={t('settings.cron.schedulesDescription')}
			>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : tasks.length === 0 ? (
						<SettingsEmptyState
							icon={ListChecks}
							title={t('settings.cron.emptyTitle')}
							description={t('settings.cron.emptyDescription')}
						/>
					) : (
						tasks.map((task) => (
							<Item
								key={task.id}
								variant="outline"
								size="md"
								className="border-b border-border/60 last:border-b-0"
							>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
									<ItemTitle className="max-w-full truncate">{task.name}</ItemTitle>
									<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground">
										{describeAction(task)}
									</p>
									{task.cronExpression && (
										<code className="text-[11px] text-muted-foreground">{task.cronExpression}</code>
									)}
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end">
									<Badge variant={task.enabled ? 'default' : 'secondary'} className="text-[10px] leading-none">
										{task.enabled ? t('settings.cron.enabled') : t('settings.cron.disabled')}
									</Badge>
								</ItemActions>
							</Item>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default TasksPage;
