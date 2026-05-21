import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CircleOff, FolderOpen, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../../components';
import type {
	AgentHistoryContentBlock,
	AgentHistoryMessage,
} from '../../../../../../../../shared/service';

const FRIDAY_AGENT_ID = 'main';
const FRIDAY_AGENT_SLUG = 'friday';

interface ChatHistoryStats {
	readonly messageCount: number;
	readonly userMessages: number;
	readonly assistantMessages: number;
	readonly toolResults: number;
	readonly contextCharacters: number;
	readonly estimatedTokens: number;
}

const EMPTY_CHAT_HISTORY_STATS: ChatHistoryStats = {
	messageCount: 0,
	userMessages: 0,
	assistantMessages: 0,
	toolResults: 0,
	contextCharacters: 0,
	estimatedTokens: 0,
};

function formatCount(value: number): string {
	return new Intl.NumberFormat().format(value);
}

function measureUnknown(value: unknown): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === 'string') return value.length;
	try {
		return JSON.stringify(value).length;
	} catch {
		return String(value).length;
	}
}

function contentBlockSize(block: AgentHistoryContentBlock): number {
	if (block.type === 'text') return block.text.length;
	return block.toolName.length + measureUnknown(block.toolArgs);
}

function chatHistoryMessageSize(message: AgentHistoryMessage): number {
	if (message.role === 'user') return message.content.length;
	if (message.role === 'tool') return message.content.length;
	const blocks = message.contentBlocks ?? [];
	if (blocks.length > 0) {
		return blocks.reduce((total, block) => total + contentBlockSize(block), 0);
	}
	return message.content?.length ?? 0;
}

function chatHistoryStats(history: AgentHistoryMessage[]): ChatHistoryStats {
	const contextCharacters = history.reduce(
		(total, message) => total + chatHistoryMessageSize(message),
		0
	);
	return {
		messageCount: history.length,
		userMessages: history.filter((message) => message.role === 'user').length,
		assistantMessages: history.filter((message) => message.role === 'assistant').length,
		toolResults: history.filter((message) => message.role === 'tool').length,
		contextCharacters,
		estimatedTokens: Math.ceil(contextCharacters / 4),
	};
}

const ChatHistoryPage: React.FC = () => {
	const { t } = useTranslation();
	const { agentId } = useParams<{ agentId: string }>();
	const decodedAgentId = decodeURIComponent(agentId ?? '');
	const isFridayAgent = decodedAgentId === FRIDAY_AGENT_SLUG || decodedAgentId === FRIDAY_AGENT_ID;
	const [chatHistory, setChatHistory] = useState<ChatHistoryStats>(EMPTY_CHAT_HISTORY_STATS);
	const [chatHistoryLoading, setChatHistoryLoading] = useState(true);
	const [chatHistoryDeleting, setChatHistoryDeleting] = useState(false);
	const [chatHistoryErrorKey, setChatHistoryErrorKey] = useState('');

	const refreshChatHistory = useCallback(async (): Promise<void> => {
		if (!isFridayAgent) return;
		setChatHistoryLoading(true);
		setChatHistoryErrorKey('');
		try {
			const history = await window.agent.getHistory();
			setChatHistory(chatHistoryStats(history));
		} catch {
			setChatHistory(EMPTY_CHAT_HISTORY_STATS);
			setChatHistoryErrorKey('settings.chatHistory.errors.load');
		} finally {
			setChatHistoryLoading(false);
		}
	}, [isFridayAgent]);

	useEffect(() => {
		if (!isFridayAgent) {
			setChatHistoryLoading(false);
			return;
		}
		void refreshChatHistory();
	}, [isFridayAgent, refreshChatHistory]);

	const handleOpenChatHistoryFolder = useCallback(() => {
		setChatHistoryErrorKey('');
		void window.agent.openHistoryFolder().catch(() => {
			setChatHistoryErrorKey('settings.chatHistory.errors.openFolder');
		});
	}, []);

	const handleDeleteChatHistory = useCallback(async (): Promise<void> => {
		if (!window.confirm(t('settings.chatHistory.confirmDelete'))) return;
		setChatHistoryDeleting(true);
		setChatHistoryErrorKey('');
		try {
			await window.agent.reset();
			setChatHistory(EMPTY_CHAT_HISTORY_STATS);
		} catch {
			setChatHistoryErrorKey('settings.chatHistory.errors.delete');
			await refreshChatHistory();
		} finally {
			setChatHistoryDeleting(false);
		}
	}, [refreshChatHistory, t]);

	if (!isFridayAgent) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader
					title={t('settings.chatHistory.title')}
					description={t('settings.chatHistory.description')}
				/>
				<Card size="sm" className="p-0!">
					<SettingsEmptyState
						icon={CircleOff}
						title={t('settings.operators.notFoundTitle')}
						description={t('settings.operators.notFoundDescription')}
						className="min-h-28"
					/>
				</Card>
			</SettingsPageShell>
		);
	}

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.chatHistory.title')}
				description={t('settings.chatHistory.description')}
			/>

			<SettingsSection title={t('settings.chatHistory.title')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60 last:border-b-0">
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.chatHistory.messages')}</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{chatHistoryLoading
									? t('settings.chatHistory.loading')
									: t('settings.chatHistory.breakdown', {
											user: formatCount(chatHistory.userMessages),
											assistant: formatCount(chatHistory.assistantMessages),
											tool: formatCount(chatHistory.toolResults),
										})}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
								{chatHistoryLoading
									? t('settings.chatHistory.loading')
									: t('settings.chatHistory.messageCountValue', {
											count: formatCount(chatHistory.messageCount),
										})}
							</span>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60 last:border-b-0">
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.chatHistory.contextSize')}</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{t('settings.chatHistory.contextSizeDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
								{chatHistoryLoading
									? t('settings.chatHistory.loading')
									: t('settings.chatHistory.contextSizeValue', {
											characters: formatCount(chatHistory.contextCharacters),
											tokens: formatCount(chatHistory.estimatedTokens),
										})}
							</span>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.chatHistory.actions')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item
						as="button"
						type="button"
						variant="outline"
						size="md"
						className="border-b border-border/60 text-left hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50 last:border-b-0"
						onClick={handleOpenChatHistoryFolder}
						disabled={chatHistoryDeleting}
						aria-label={t('settings.chatHistory.openFolder')}
					>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.chatHistory.openFolder')}</ItemTitle>
							{chatHistoryErrorKey === 'settings.chatHistory.errors.openFolder' && (
								<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
									{t(chatHistoryErrorKey)}
								</p>
							)}
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<FolderOpen className="size-3 text-muted-foreground" strokeWidth={1.8} />
						</ItemActions>
					</Item>

					<Item
						as="button"
						type="button"
						variant="outline"
						size="md"
						className="border-b border-border/60 text-left hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 last:border-b-0"
						onClick={() => void handleDeleteChatHistory()}
						disabled={chatHistoryLoading || chatHistoryDeleting || chatHistory.messageCount === 0}
						aria-label={t('settings.chatHistory.delete')}
					>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>
								{chatHistoryDeleting
									? t('settings.chatHistory.deleting')
									: t('settings.chatHistory.delete')}
							</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{chatHistoryErrorKey === 'settings.chatHistory.errors.delete'
									? t(chatHistoryErrorKey)
									: t('settings.chatHistory.actionsDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Trash2 className="size-3 text-destructive" strokeWidth={1.8} />
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ChatHistoryPage;
