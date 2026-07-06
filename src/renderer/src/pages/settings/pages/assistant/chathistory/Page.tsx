import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LoaderCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentSessionSummary } from '@/lib/compat';
import { useChatSession } from '@/contexts/chat-session';
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

function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && Boolean(target.closest('button,a'));
}

const ChatHistoryPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { setSessionId } = useChatSession();
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

	const handleOpenSession = (sessionId: string): void => {
		setSessionId(sessionId);
		navigate('/home');
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.chatHistory.title')}
				description={t('settings.chatHistory.description')}
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
							<div
								key={session.id}
								role="button"
								tabIndex={0}
								className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40"
								onClick={(event) => {
									if (isInteractiveTarget(event.target)) return;
									handleOpenSession(session.id);
								}}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										handleOpenSession(session.id);
									}
								}}
							>
								<SettingsRow
									title={title}
									description={formatSessionDate(session.createdAtMs)}
									className="grid-cols-[minmax(0,1fr)_auto] border-b-0"
									actionClassName="w-auto justify-end"
									actions={
										<Button
											type="button"
											variant="destructive"
											size="icon"
											className="size-8"
											disabled={deletingSessionId !== null}
											aria-label={t('settings.chatHistory.deleteSession', { title })}
											onClick={(event) => {
												event.stopPropagation();
												void handleDelete(session);
											}}
										>
											{isDeleting ? (
												<LoaderCircle className="size-3 animate-spin" />
											) : (
												<Trash2 className="size-3" />
											)}
										</Button>
									}
								/>
							</div>
						);
					})
				)}
			</SettingsPanel>
		</SettingsPageShell>
	);
};

export default ChatHistoryPage;
