import { useState, type ReactElement, type ReactNode } from 'react';
import { Copy, Reply, Volume2 } from 'lucide-react';
import { Markdown } from '@/components/prompt-kit/markdown';
import { Message, MessageActions } from '@/components/prompt-kit/message';
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { ToolActivityGroup } from './ToolActivityGroup';
import { ToolPermissionCard } from './ToolPermissionCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type AgentMessage, type AgentToolPart } from '../context';
import { useReadMessageAloud } from '../hooks';
import { markdownComponents } from './markdown';
import { statusLabel, isRunningState, stateTone } from './status';

const LONG_MESSAGE_LENGTH = 600;

function generatedImagePaths(tools: readonly AgentToolPart[]): string[] {
	return tools
		.filter((tool) => tool.type === 'create_image' && tool.state === 'output-available')
		.map((tool) => (tool.output as { path?: unknown } | undefined)?.path)
		.filter((path): path is string => typeof path === 'string');
}

function localImageSrc(src: string | undefined, imagePaths: readonly string[]): string | undefined {
	if (!src || /^[a-z][a-z0-9+.-]*:/i.test(src)) return src;
	const resolved =
		imagePaths.find((path) => path === src || path.endsWith(`/${src}`)) ??
		(src.startsWith('/') ? src : undefined);
	return resolved ? `local-resource://${encodeURI(resolved)}` : src;
}

function fileName(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

function normalizeImageLinks(content: string): string {
	return content.replace(/!\[([^\]]*)\]\(([^()\n]+)\)/g, (match, alt: string, dest: string) => {
		const destination = dest.trim();
		if (!destination.includes(' ') || destination.startsWith('<')) return match;
		return `![${alt}](<${destination}>)`;
	});
}

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
	const { speak, isSpeaking, errorMessage: speakErrorMessage, clearError } = useReadMessageAloud();

	const hasContent = message.content.length > 0;
	const messageText = message.content.trim();
	const hasTools = message.tools.length > 0;
	const imagePaths = generatedImagePaths(message.tools);
	const standaloneImagePaths = imagePaths.filter(
		(path) => !message.content.includes(fileName(path))
	);
	const messageMarkdownComponents = {
		...markdownComponents,
		img: ({ src, alt }: { src?: string; alt?: string }) => (
			<img
				src={localImageSrc(src, imagePaths)}
				alt={alt ?? ''}
				className="my-2 max-w-md rounded-lg border border-border/50"
			/>
		),
	};
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
		clearError();
		speak(message.content);
	};

	const readAloudTitle =
		speakErrorMessage ?? (isSpeaking ? 'Reading message aloud' : 'Read message aloud');

	return (
		<Message className={cn('flex w-full flex-col', className)}>
			{hasTools && <ToolActivityGroup tools={message.tools} />}
			{message.pendingPermission && (
				<ToolPermissionCard
					key={message.pendingPermission.toolCallId}
					permission={message.pendingPermission}
				/>
			)}
			{standaloneImagePaths.length > 0 && (
				<div className="flex w-full flex-col gap-2">
					{standaloneImagePaths.map((path) => (
						<img
							key={path}
							src={`local-resource://${encodeURI(path)}`}
							alt="Generated image"
							className="max-w-md rounded-lg border border-border/50"
						/>
					))}
				</div>
			)}
			{hasContent && (
				<>
					<Markdown
						components={messageMarkdownComponents}
					>
						{normalizeImageLinks(message.content)}
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
							className={cn(
								'text-muted-foreground hover:text-foreground',
								speakErrorMessage && 'text-destructive hover:text-destructive'
							)}
							aria-label="Read message aloud"
							title={readAloudTitle}
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
