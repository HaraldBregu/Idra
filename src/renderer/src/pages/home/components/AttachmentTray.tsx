import { type ReactElement } from 'react';
import { FileAudio, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PromptAttachment = {
	readonly id: string;
	readonly kind: 'file' | 'audio';
	readonly file: File;
	readonly url?: string;
	readonly durationMs?: number;
};

function attachmentId(): string {
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	return `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDuration(durationMs: number): string {
	const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatFileSize(size: number): string {
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
	return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function filesToAttachments(files: File[]): PromptAttachment[] {
	return files.map((file) => ({
		id: attachmentId(),
		kind: 'file',
		file,
	}));
}

export function AttachmentTray({
	attachments,
	onRemove,
}: {
	readonly attachments: readonly PromptAttachment[];
	readonly onRemove: (id: string) => void;
}): ReactElement | null {
	if (attachments.length === 0) return null;

	return (
		<div className="mb-2 flex max-h-32 w-full flex-col gap-1.5 overflow-y-auto rounded-lg border border-border/60 bg-card/95 p-2 shadow-sm shadow-foreground/5">
			{attachments.map((attachment) => {
				const isAudio = attachment.kind === 'audio';
				const title = isAudio
					? `Audio ${formatDuration(attachment.durationMs ?? 0)}`
					: attachment.file.name;

				return (
					<div
						key={attachment.id}
						className="flex min-w-0 items-center gap-2 rounded-md border border-border/50 bg-background/70 px-2 py-1.5"
					>
						<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
							{isAudio ? <FileAudio className="size-4" /> : <Paperclip className="size-4" />}
						</span>
						<div className="min-w-0 flex-1">
							<p className="truncate text-xs font-medium leading-4">{title}</p>
							<p className="truncate text-[11px] leading-4 text-muted-foreground">
								{attachment.file.name} - {formatFileSize(attachment.file.size)}
							</p>
						</div>
						{isAudio && attachment.url ? (
							<audio
								controls
								src={attachment.url}
								className="h-7 w-32 shrink-0 sm:w-40"
							/>
						) : null}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
							aria-label={`Remove ${title}`}
							onClick={() => onRemove(attachment.id)}
						>
							<X className="size-3.5" />
						</Button>
					</div>
				);
			})}
		</div>
	);
}
