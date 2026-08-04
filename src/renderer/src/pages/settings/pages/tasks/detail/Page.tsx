import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';

type Task = Awaited<ReturnType<typeof window.tasks.list>>[number];

const TaskDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const { taskId } = useParams<{ taskId: string }>();
	const decodedTaskId = decodeURIComponent(taskId ?? '');
	const [task, setTask] = useState<Task | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		void window.tasks
			.list()
			.then((tasks) => {
				if (mounted) setTask(tasks.find((item) => item.id === decodedTaskId) ?? null);
			})
			.catch((caught: unknown) => {
				if (mounted) setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, [decodedTaskId]);

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.cron.detailsTitle')} />
				<SettingsLoadingRows rows={4} />
			</SettingsPageShell>
		);
	}

	if (!task) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.cron.detailsTitle')} />
				{error && <SettingsNotice variant="destructive" icon={AlertTriangle}>{error}</SettingsNotice>}
				<Card size="sm" className="gap-0! p-0!">
					<SettingsEmptyState
						icon={ListChecks}
						title={t('settings.cron.notFoundTitle')}
						description={t('settings.cron.notFoundDescription')}
						className="min-h-28"
					/>
				</Card>
			</SettingsPageShell>
		);
	}

	const action = task.action.type === 'agent' ? task.action.prompt : task.action.message;
	const actionType = task.action.type === 'agent'
		? t('settings.cron.detail.agent')
		: t('settings.cron.detail.debug');

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={task.name}
				description={task.description ?? t('settings.cron.detail.noDescription')}
				action={
					<Badge variant={task.enabled ? 'default' : 'secondary'}>
						{task.enabled ? t('settings.cron.enabled') : t('settings.cron.disabled')}
					</Badge>
				}
			/>

			<SettingsSection title={t('settings.cron.detailsTitle')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>{t('settings.cron.detail.id')}</ItemTitle></ItemContent>
						<ItemActions className="ml-auto justify-end"><code className="max-w-[55vw] truncate text-[11px]">{task.id}</code></ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>{t('settings.cron.detail.schedule')}</ItemTitle></ItemContent>
						<ItemActions className="ml-auto justify-end"><code className="max-w-[55vw] truncate text-[11px]">{task.cronExpression ?? t('settings.cron.detail.notScheduled')}</code></ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>{t('settings.cron.detail.actionType')}</ItemTitle></ItemContent>
						<ItemActions className="ml-auto justify-end"><span className="text-xs">{actionType}</span></ItemActions>
					</Item>
					{task.action.type === 'agent' && <>
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>{t('settings.cron.detail.effort')}</ItemTitle></ItemContent>
							<ItemActions className="ml-auto justify-end"><span className="text-xs">{task.action.effort}</span></ItemActions>
						</Item>
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>{t('settings.cron.detail.permissionMode')}</ItemTitle></ItemContent>
							<ItemActions className="ml-auto justify-end"><span className="text-xs">{task.action.permissionMode ?? t('settings.cron.detail.notSet')}</span></ItemActions>
						</Item>
					</>}
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>{t('settings.cron.detail.createdAt')}</ItemTitle></ItemContent>
						<ItemActions className="ml-auto justify-end"><time className="text-xs" dateTime={task.createdAt}>{new Date(task.createdAt).toLocaleString()}</time></ItemActions>
					</Item>
					<Item variant="outline" size="md">
						<ItemContent><ItemTitle>{t('settings.cron.detail.updatedAt')}</ItemTitle></ItemContent>
						<ItemActions className="ml-auto justify-end"><time className="text-xs" dateTime={task.updatedAt}>{new Date(task.updatedAt).toLocaleString()}</time></ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.cron.detail.action')}>
				<Card size="sm" className="p-4!">
					<pre className="whitespace-pre-wrap break-words font-sans text-xs leading-5 text-foreground">{action}</pre>
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default TaskDetailsPage;
