import { useState, type ReactElement, type ReactNode } from 'react';
import { Copy, Reply, Volume2 } from 'lucide-react';
import { Markdown } from '@/components/prompt-kit/markdown';
import { Message, MessageActions } from '@/components/prompt-kit/message';
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { ToolActivityGroup } from './ToolActivityGroup';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SPEECH_MAX_TEXT_LENGTH } from '@shared/speech_types';
import { type AgentMessage } from '../context';
import { markdownComponents } from './markdown';
import { statusLabel, isRunningState, stateTone } from './status';

const LONG_MESSAGE_LENGTH = 600;

function statusLabelContent(
	message: AgentMessage,
	isStreaming: boolean,
	label: string
): ReactNode {
	if (isStreaming && isRunningState(message.state)) {
		return <TextShimmer className="text-sm">{label}</TextShimmer>;
	}

	return label;
}

export function AssistantMessage({
	message,
	isStreaming = false,
	collapseLongContent = false,
	className,
	onReply,
}: {
	readonly message: AgentMessage;
	readonly isStreaming?: boolean;
	readonly showHeader?: boolean;
	readonly collapseLongContent?: boolean;
	readonly className?: string;
	readonly onReply?: () => void;
}): ReactElement {
	const canToggleContent =
		collapseLongContent && message.content.trim().length > LONG_MESSAGE_LENGTH;
	const [isContentExpanded, setIsContentExpanded] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);

	const hasContent = message.content.length > 0;
	const messageText = message.content.trim();
	const hasTools = message.tools.length > 0;
	const showActivity =
		hasTools ||
		(message.state !== 'idle' && message.state !== 'completed') ||
		Boolean(message.errorText);
	const label = statusLabel(message);
	const labelContent = statusLabelContent(message, isStreaming, label);
	const statusClassName = cn(
		'inline-flex min-h-6 max-w-full items-center rounded-full px-2 py-0.5 text-xs font-semibold',
		stateTone(message.state)
	);

	const copyMessage = (): void => {
		if (messageText.length === 0) return;
		void (async () => {
			if (navigator.clipboard?.writeText) {
				const copied = await navigator.clipboard
					.writeText(messageText)
					.then(() => true, () => false);
				if (copied) return;
			}

			const textarea = document.createElement('textarea');
			textarea.value = messageText;
			textarea.setAttribute('readonly', '');
			textarea.style.position = 'fixed';
			textarea.style.left = '-9999px';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		})();
	};

	const speakMessage = (): void => {
		if (messageText.length === 0 || isSpeaking) return;
		setIsSpeaking(true);
		void (async () => {
			try {
				const result = await window.voice.synthesize({
					text: messageText.slice(0, SPEECH_MAX_TEXT_LENGTH),
				});
				const audio = new Audio(`data:${result.mimeType};base64,${result.audio}`);
				await audio.play();
				await new Promise((resolve) => {
					audio.onended = resolve;
					audio.onerror = resolve;
				});
			} finally {
				setIsSpeaking(false);
			}
		})().catch(() => {});
	};

	return (
		<Message className={cn('flex w-full flex-col', className)}>
			{hasTools && (
				<div className="w-full">
					<div className="flex w-full flex-col gap-4">
						{message.tools.map((tool) => (
							<Tool
								key={tool.toolCallId}
								toolPart={tool}
								className="mt-0 w-full max-w-2xl"
							/>
						))}
					</div>
				</div>
			)}
			{hasContent && (
				<>
					<Markdown
						components={markdownComponents}
					>
						{message.content}
					</Markdown>
					{canToggleContent ? (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className="self-start text-muted-foreground hover:text-foreground"
							aria-expanded={isContentExpanded}
							onClick={() => setIsContentExpanded((expanded) => !expanded)}
						>
							{isContentExpanded ? 'Less' : 'More'}
						</Button>
					) : null}
					<MessageActions className="mt-1 gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="text-muted-foreground hover:text-foreground"
							aria-label="Copy message"
							title="Copy message"
							onClick={copyMessage}
						>
							<Copy className="size-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="text-muted-foreground hover:text-foreground"
							aria-label="Read message aloud"
							title="Read message aloud"
							disabled={isSpeaking}
							onClick={speakMessage}
						>
							<Volume2 className="size-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="text-muted-foreground hover:text-foreground"
							aria-label="Reply"
							title="Reply"
							disabled={!onReply}
							onClick={onReply}
						>
							<Reply className="size-3.5" />
						</Button>
					</MessageActions>
				</>
			)}
			{showActivity && !hasTools && (
				<div className="flex w-full flex-col">
					<span className={statusClassName}>{labelContent}</span>
				</div>
			)}
		</Message>
	);
}
