import React, { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ClipboardList, LoaderCircle, Play, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { Model } from '../../../../../../shared/agents/service';
import type { PublicProvider } from '../../../../../../shared/providers';
import type { TaskRecord, TaskRunRequest } from '../../../../../../shared/tasks';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import {
	formatTimestamp,
	sortTasks,
	taskStatusLabelKey,
	taskStatusVariant,
} from './utils';

function TaskLoadingList(): React.JSX.Element {
	return (
		<SettingsPanel>
			<div className="grid gap-0">
				{[0, 1, 2].map((index) => (
					<div key={index} className="flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0">
						<Skeleton className="size-6 rounded-md" />
						<div className="min-w-0 flex-1">
							<Skeleton className="h-4 w-48 max-w-full" />
							<Skeleton className="mt-2 h-3 w-72 max-w-full" />
						</div>
						<Skeleton className="h-4 w-16 rounded-full" />
					</div>
				))}
			</div>
		</SettingsPanel>
	);
}

function mergeModels(models: readonly Model[], selectedModel?: Model): Model[] {
	const byId = new Map(models.map((model) => [model.id, model]));
	if (selectedModel && !byId.has(selectedModel.id)) byId.set(selectedModel.id, selectedModel);
	return [...byId.values()];
}

function TaskAgentRuntimeSettings(): React.JSX.Element {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [models, setModels] = useState<Model[]>([]);
	const [providerId, setProviderId] = useState('');
	const [modelId, setModelId] = useState('');
	const [loading, setLoading] = useState(true);
	const [loadingModels, setLoadingModels] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [runtimeError, setRuntimeError] = useState<string | null>(null);

	const selectedProvider = providers.find((provider) => provider.id === providerId);
	const selectedModel = models.find((model) => model.id === modelId);

	useEffect(() => {
		let mounted = true;

		async function loadRuntimeSettings(): Promise<void> {
			setLoading(true);
			setRuntimeError(null);
			try {
				const [nextProviders, currentAgentService] = await Promise.all([
					window.store.getProviders(),
					window.store.getAgentService(),
				]);
				if (!mounted) return;

				const providerList =
					currentAgentService?.provider &&
					!nextProviders.some((provider) => provider.id === currentAgentService.provider.id)
						? [...nextProviders, currentAgentService.provider]
						: nextProviders;
				const nextProvider =
					providerList.find((provider) => provider.id === currentAgentService?.provider.id) ??
					providerList[0];

				setProviders(providerList);
				setProviderId(nextProvider?.id ?? '');
				if (!nextProvider) {
					setModels([]);
					setModelId('');
					return;
				}

				const loadedModels = await window.app.getModels(nextProvider);
				if (!mounted) return;
				const nextModels =
					currentAgentService?.provider.id === nextProvider.id
						? mergeModels(loadedModels, currentAgentService.model)
						: loadedModels;
				setModels(nextModels);
				setModelId(
					currentAgentService?.provider.id === nextProvider.id
						? currentAgentService.model.id
						: (nextModels[0]?.id ?? '')
				);
			} catch (caught) {
				if (mounted) setRuntimeError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				if (mounted) setLoading(false);
			}
		}

		void loadRuntimeSettings();

		return () => {
			mounted = false;
		};
	}, []);

	const handleProviderChange = (nextProviderId: string | null): void => {
		const nextId = nextProviderId ?? '';
		if (nextId === providerId) return;
		const nextProvider = providers.find((provider) => provider.id === nextId);
		setProviderId(nextId);
		setModelId('');
		setModels([]);
		setSaved(false);
		setRuntimeError(null);
		if (!nextProvider) return;

		setLoadingModels(true);
		void window.app
			.getModels(nextProvider)
			.then((nextModels) => {
				setModels(nextModels);
				setModelId(nextModels[0]?.id ?? '');
			})
			.catch((caught) => {
				setRuntimeError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				setLoadingModels(false);
			});
	};

	const handleSave = async (): Promise<void> => {
		if (!selectedProvider || !selectedModel) return;
		setSaving(true);
		setSaved(false);
		setRuntimeError(null);
		try {
			const didSave = await window.store.saveAgentService(selectedProvider, selectedModel);
			if (!didSave) throw new Error(t('settings.taskManager.runtime.errors.saveFailed'));
			setSaved(true);
		} catch (caught) {
			setRuntimeError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SettingsSection
			title={t('settings.taskManager.runtime.title')}
			description={t('settings.taskManager.runtime.description')}
		>
			<SettingsPanel>
				<div className="grid gap-3 px-3 py-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<SettingsField id="task-runtime-provider" label={t('settings.taskManager.runtime.provider')}>
							<Select
								value={providerId}
								onValueChange={handleProviderChange}
								disabled={loading || providers.length === 0 || saving}
							>
								<SelectTrigger id="task-runtime-provider" className="w-full text-xs">
									<SelectValue placeholder={t('settings.taskManager.runtime.providerPlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									{providers.map((provider) => (
										<SelectItem key={provider.id} value={provider.id}>
											{provider.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SettingsField>

						<SettingsField id="task-runtime-model" label={t('settings.taskManager.runtime.model')}>
							<Select
								value={modelId}
								onValueChange={(nextModelId) => {
									const nextId = nextModelId ?? '';
									if (nextId === modelId) return;
									setModelId(nextId);
									setSaved(false);
								}}
								disabled={loading || loadingModels || !selectedProvider || models.length === 0 || saving}
							>
								<SelectTrigger id="task-runtime-model" className="w-full text-xs">
									<SelectValue
										placeholder={
											loadingModels
												? t('settings.taskManager.runtime.modelsLoading')
												: t('settings.taskManager.runtime.modelPlaceholder')
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{models.map((model) => (
										<SelectItem key={model.id} value={model.id}>
											{model.name || model.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SettingsField>
					</div>

					{providers.length === 0 && !loading && (
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.taskManager.runtime.noProviders')}
						</p>
					)}
					{selectedProvider && models.length === 0 && !loading && !loadingModels && (
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.taskManager.runtime.noModels')}
						</p>
					)}
					{runtimeError && (
						<div className="flex min-w-0 items-start gap-2 text-destructive">
							<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
							<div className="min-w-0 text-xs leading-5">{runtimeError}</div>
						</div>
					)}
					{saved && (
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.taskManager.runtime.saved')}
						</p>
					)}

					<div className="flex justify-end">
						<Button
							type="button"
							size="sm"
							disabled={loading || loadingModels || saving || !selectedProvider || !selectedModel}
							onClick={() => void handleSave()}
						>
							{saving ? <LoaderCircle className="size-3 animate-spin" /> : <Save className="size-3" />}
							{saving ? t('settings.taskManager.runtime.saving') : t('settings.taskManager.runtime.save')}
						</Button>
					</div>
				</div>
			</SettingsPanel>
		</SettingsSection>
	);
}

const TaskManagerPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [tasks, setTasks] = useState<readonly TaskRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [title, setTitle] = useState('');
	const [message, setMessage] = useState('');
	const [creating, setCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		setLoading(true);
		window.tasks
			.list()
			.then((nextTasks) => {
				if (!mounted) return;
				setTasks(sortTasks(nextTasks));
				setError(null);
			})
			.catch((caught) => {
				if (mounted) setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		return window.tasks.onEvent((event) => {
			setTasks((current) => sortTasks([
				event.task,
				...current.filter((task) => task.id !== event.task.id),
			]));
		});
	}, []);

	const navigateToTask = (taskId: string): void => {
		navigate(`/settings/task-manager/taskdetails/${encodeURIComponent(taskId)}`);
	};

	const handleCreateTask = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		setCreateError(null);

		const trimmedTitle = title.trim();
		const trimmedMessage = message.trim();
		if (!trimmedMessage) {
			setCreateError(t('settings.taskManager.create.errors.messageRequired'));
			return;
		}
		const request: TaskRunRequest = {
			type: 'agent.run',
			title: trimmedTitle || t('settings.taskManager.create.defaultAgentTitle'),
			input: { message: trimmedMessage },
		};

		setCreating(true);
		try {
			const task = await window.tasks.start(request);
			setTasks((current) => sortTasks([
				task,
				...current.filter((item) => item.id !== task.id),
			]));
			navigateToTask(task.id);
		} catch (caught) {
			setCreateError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setCreating(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.backgroundTasks')}
				description={t('settings.taskManager.description')}
			/>
			<TaskAgentRuntimeSettings />

			<SettingsSection title={t('settings.taskManager.create.title')}>
				<SettingsPanel>
					<form className="grid gap-3 px-3 py-3" onSubmit={(event) => void handleCreateTask(event)}>
						<SettingsField id="task-title" label={t('settings.taskManager.create.taskTitle')}>
							<Input
								id="task-title"
								value={title}
								onChange={(event) => setTitle(event.currentTarget.value)}
								placeholder={t('settings.taskManager.create.taskTitlePlaceholder')}
								disabled={creating}
								className="h-8 text-xs"
							/>
						</SettingsField>

						<SettingsField id="task-message" label={t('settings.taskManager.create.message')}>
							<Textarea
								id="task-message"
								value={message}
								onChange={(event) => setMessage(event.currentTarget.value)}
								placeholder={t('settings.taskManager.create.messagePlaceholder')}
								disabled={creating}
								className="min-h-24 text-xs"
							/>
						</SettingsField>

						{createError && (
							<div className="flex min-w-0 items-start gap-2 text-destructive">
								<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
								<div className="min-w-0 text-xs leading-5">{createError}</div>
							</div>
						)}

						<div className="flex justify-end">
							<Button type="submit" size="sm" disabled={creating}>
								<Play className="size-3" />
								{creating
									? t('settings.taskManager.create.starting')
									: t('settings.taskManager.create.start')}
							</Button>
						</div>
					</form>
				</SettingsPanel>
			</SettingsSection>
			<SettingsSection title={t('settings.sections.backgroundTasks')}>
				{error && (
					<SettingsPanel>
						<div className="flex min-w-0 items-start gap-2 px-3 py-2 text-destructive">
							<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
							<div className="min-w-0 text-xs leading-5">{error}</div>
						</div>
					</SettingsPanel>
				)}

				{loading ? (
					<TaskLoadingList />
				) : tasks.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={ClipboardList}
							title={t('settings.taskManager.emptyTitle')}
							description={t('settings.taskManager.emptyDescription')}
							className="min-h-28"
						/>
					</SettingsPanel>
				) : (
					<SettingsPanel>
						{tasks.map((task) => (
							<Item
								key={task.id}
								as="button"
								type="button"
								onClick={() => navigateToTask(task.id)}
								variant="outline"
								size="md"
								className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
							>
								<ItemMedia variant="icon">
									<ClipboardList className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
									<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
										{task.title}
									</ItemTitle>
									<div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-muted-foreground">
										<span className="max-w-56 truncate font-mono">{task.type}</span>
										<span>{formatTimestamp(task.createdAt)}</span>
									</div>
								</ItemContent>
								<ItemActions className="ml-auto flex-none items-center justify-end gap-1.5">
									<Badge
										variant={taskStatusVariant(task.status)}
										className="h-4 px-1.5 text-[10px]"
									>
										{t(taskStatusLabelKey(task.status))}
									</Badge>
									<ChevronRight
										className="size-3 shrink-0 text-muted-foreground"
										strokeWidth={1.8}
									/>
								</ItemActions>
							</Item>
						))}
					</SettingsPanel>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default TaskManagerPage;
