import React, { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ClipboardList, Play } from 'lucide-react';
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

type CreateTaskType = 'agent.run' | 'ocr.run';

const CREATE_TASK_TYPES: readonly CreateTaskType[] = ['agent.run', 'ocr.run'];

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

const TaskManagerPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [tasks, setTasks] = useState<readonly TaskRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [createType, setCreateType] = useState<CreateTaskType>('agent.run');
	const [title, setTitle] = useState('');
	const [message, setMessage] = useState('');
	const [imageBase64, setImageBase64] = useState('');
	const [mimeType, setMimeType] = useState('image/png');
	const [language, setLanguage] = useState('');
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
		let request: TaskRunRequest;
		if (createType === 'agent.run') {
			const trimmedMessage = message.trim();
			if (!trimmedMessage) {
				setCreateError(t('settings.taskManager.create.errors.messageRequired'));
				return;
			}
			request = {
				type: createType,
				title: trimmedTitle || t('settings.taskManager.create.defaultAgentTitle'),
				input: { message: trimmedMessage },
			};
		} else {
			const trimmedImage = imageBase64.trim();
			if (!trimmedImage) {
				setCreateError(t('settings.taskManager.create.errors.imageRequired'));
				return;
			}
			request = {
				type: createType,
				title: trimmedTitle || t('settings.taskManager.create.defaultOcrTitle'),
				input: {
					imageBase64: trimmedImage,
					mimeType: mimeType.trim() || undefined,
					language: language.trim() || undefined,
				},
			};
		}

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
				title={t('settings.tabs.taskManager')}
				description={t('settings.taskManager.description')}
			/>
			<SettingsSection title={t('settings.taskManager.create.title')}>
				<SettingsPanel>
					<form className="grid gap-3 px-3 py-3" onSubmit={(event) => void handleCreateTask(event)}>
						<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
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
							<SettingsField id="task-type" label={t('settings.taskManager.create.type')}>
								<Select
									value={createType}
									onValueChange={(value) => {
										if (value && CREATE_TASK_TYPES.includes(value as CreateTaskType)) {
											setCreateType(value as CreateTaskType);
										}
									}}
									disabled={creating}
								>
									<SelectTrigger id="task-type" className="w-full text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="agent.run">
											{t('settings.taskManager.create.typeAgent')}
										</SelectItem>
										<SelectItem value="ocr.run">
											{t('settings.taskManager.create.typeOcr')}
										</SelectItem>
									</SelectContent>
								</Select>
							</SettingsField>
						</div>

						{createType === 'agent.run' ? (
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
						) : (
							<div className="grid gap-3">
								<SettingsField
									id="task-image-base64"
									label={t('settings.taskManager.create.imageBase64')}
								>
									<Textarea
										id="task-image-base64"
										value={imageBase64}
										onChange={(event) => setImageBase64(event.currentTarget.value)}
										placeholder={t('settings.taskManager.create.imageBase64Placeholder')}
										disabled={creating}
										className="min-h-24 font-mono text-xs"
									/>
								</SettingsField>
								<div className="grid gap-3 sm:grid-cols-2">
									<SettingsField id="task-mime-type" label={t('settings.taskManager.create.mimeType')}>
										<Input
											id="task-mime-type"
											value={mimeType}
											onChange={(event) => setMimeType(event.currentTarget.value)}
											placeholder={t('settings.taskManager.create.mimeTypePlaceholder')}
											disabled={creating}
											className="h-8 text-xs"
										/>
									</SettingsField>
									<SettingsField id="task-language" label={t('settings.taskManager.create.language')}>
										<Input
											id="task-language"
											value={language}
											onChange={(event) => setLanguage(event.currentTarget.value)}
											placeholder={t('settings.taskManager.create.languagePlaceholder')}
											disabled={creating}
											className="h-8 text-xs"
										/>
									</SettingsField>
								</div>
							</div>
						)}

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
			<SettingsSection title={t('settings.sections.taskManager')}>
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
