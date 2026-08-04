import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { History, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEFAULT_CHAT_SESSION_ID, useChatSession } from '@/contexts/chat-session';
import type { AgentSessionSummary } from '@/lib/compat';

export function SessionsButton(): ReactElement {
	const { t } = useTranslation();
	const { sessionId, setSessionId } = useChatSession();
	const [sessions, setSessions] = useState<AgentSessionSummary[]>([]);

	const refresh = useCallback((): void => {
		window.agent
			?.listSessions()
			.then(setSessions)
			.catch(() => undefined);
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const newSession = useCallback((): void => {
		setSessionId(crypto.randomUUID());
	}, [setSessionId]);

	const newChatLabel = t('titleBar.newChat', 'New chat');
	const historyLabel = t('titleBar.chatHistory', 'Chat history');
	const currentSessionId =
		sessionId === DEFAULT_CHAT_SESSION_ID ? sessions[0]?.id : sessionId;
	return (
		<DropdownMenu
			onOpenChange={(open) => {
				if (open) refresh();
			}}
		>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-8 rounded-full"
						title={historyLabel}
						aria-label={historyLabel}
					/>
				}
			>
				<History className="size-4" strokeWidth={1.8} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64">
				<DropdownMenuItem onClick={newSession}>
					<Plus className="size-4" />
					{newChatLabel}
				</DropdownMenuItem>
				{sessions.length > 0 && (
					<>
						<DropdownMenuSeparator />
						{sessions.map((session) => (
							<DropdownMenuCheckboxItem
								key={session.id}
								checked={session.id === currentSessionId}
								closeOnClick
								onClick={() => setSessionId(session.id)}
							>
								<span className="truncate">
									{session.title || new Date(session.createdAtMs).toLocaleString()}
								</span>
							</DropdownMenuCheckboxItem>
						))}
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
