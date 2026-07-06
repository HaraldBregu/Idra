import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentSessionSummary } from '@/lib/compat';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
} from '../../../components';
import { firstErrorMessage } from '../../../components/model-configuration-state';

function formatSessionDate(createdAtMs: number): string {
	return new Date(createdAtMs).toLocaleString();
}

const ChatHistoryPage: React.FC = () => {
	const { t } = useTranslation();
	const [sessions, setSessions] = useState<AgentSessionSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

	const loadSessions = useCallback(async (): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			const nextSessions = await window.agent.listSessions();
			setSessions(nextSessions);
		} catch (loadError) {
			setError(firstErrorMessage(loadError, t('settings.chatHistory.errors.load')));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void loadSessions();
	}, [loadSessions]);

	const handleDelete = async (session: AgentSessionSummary): Promise<void> => {
		const title = session.title.trim() || t('settings.chatHistory.untitled');
		if (!window.confirm(t('settings.chatHistory.confirmDeleteSession', { title }))) return;
		setDeletingSessionId(session.id);
		setError(null);
		try {
			await window.agent.deleteSession(session.id);
			setSessions((current) => current.filter((entry) => entry.id !== session.id));
		} catch (deleteError) {
			setError(firstErrorMessage(deleteError, t('settings.chatHistory.errors.delete')));
		} finally {
			setDeletingSessionId(null);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.chatHistory.title')}
				description={t('settings.chatHistory.description')}
				action={
					<Button
						type="button"
						variant="outline"
						size="xs"
						disabled={loading || deletingSessionId !== null}
						onClick={() => void loadSessions()}
					>
						<RefreshCw className="size-3" />
						{t('settings.chatHistory.refresh')}
					</Button>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsPanel>
				{loading ? (
					<SettingsLoadingRows rows={4} />
				) : sessions.length === 0 ? (
					<SettingsEmptyState
						title={t('settings.chatHistory.empty')}
						description={t('settings.chatHistory.emptyDescription')}
					/>
				) : (
					sessions.map((session) => {
						const title = session.title.trim() || t('settings.chatHistory.untitled');
						const isDeleting = deletingSessionId === session.id;
						return (
							<SettingsRow
								key={session.id}
								title={title}
								description={formatSessionDate(session.createdAtMs)}
								className="grid-cols-[minmax(0,1fr)_auto]"
								actionClassName="w-auto justify-end"
								actions={
									<Button
										type="button"
										variant="destructive"
										size="icon"
										className="size-8"
										disabled={deletingSessionId !== null}
										aria-label={t('settings.chatHistory.deleteSession', { title })}
										onClick={() => void handleDelete(session)}
									>
										{isDeleting ? (
											<LoaderCircle className="size-3 animate-spin" />
										) : (
											<Trash2 className="size-3" />
										)}
									</Button>
								}
							/>
						);
					})
				)}
			</SettingsPanel>
		</SettingsPageShell>
	);
};

export default ChatHistoryPage;
