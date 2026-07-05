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
				<ModelProviderSelect
					idPrefix="task-runtime"
					providerGroups={LLM_PROVIDER_GROUPS}
					providerId={providerId}
					modelId={modelId}
					onProviderChange={handleProviderChange}
					onModelChange={handleModelChange}
					loading={loading}
					saving={saving}
					saved={saved}
					error={runtimeError}
					onSave={handleSave}
					labels={{
						provider: t('settings.cron.runtime.provider'),
						model: t('settings.cron.runtime.model'),
						providerPlaceholder: t('settings.cron.runtime.providerPlaceholder'),
						modelPlaceholder: t('settings.cron.runtime.modelPlaceholder'),
						saved: t('settings.cron.runtime.saved'),
						saving: t('settings.cron.runtime.saving'),
					}}
					emptyState={
						<SettingsEmptyState
							icon={AlertTriangle}
							title={t('settings.cron.runtime.noProviders')}
						/>
					}
				/>
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
