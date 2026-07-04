import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { History, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChatSession } from '@/contexts/chat-session';
import type { AgentSessionSummary } from '@/lib/compat';

export function SessionsButton(): ReactElement {
	const { t } = useTranslation();
	const { setSessionId } = useChatSession();
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

	if (sessions.length <= 1) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full"
				onPointerEnter={refresh}
				onClick={newSession}
				title={newChatLabel}
				aria-label={newChatLabel}
			>
				<Plus className="size-4" strokeWidth={1.8} />
			</Button>
		);
	}

	const historyLabel = t('titleBar.chatHistory', 'Chat history');
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
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuItem onClick={newSession}>
					<Plus className="size-4" />
					{newChatLabel}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				{sessions.map((session) => (
					<DropdownMenuItem key={session.id} onClick={() => setSessionId(session.id)}>
						<span className="truncate">
							{session.title || new Date(session.createdAtMs).toLocaleString()}
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
