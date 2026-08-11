import { Download } from 'lucide-react';
import type { MouseEventHandler, ReactElement } from 'react';
import { AudioPlayer } from '@/components/audio-player';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SoundPlayer({
	src,
	title,
	format,
	className,
	onDownload,
	onContextMenu,
}: {
	readonly src: string;
	readonly title: string;
	readonly format?: string;
	readonly className?: string;
	readonly onDownload?: () => void;
	readonly onContextMenu?: MouseEventHandler<HTMLDivElement>;
}): ReactElement {
	return (
		<div
			className={cn(
				'flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm shadow-foreground/5',
				className
			)}
			onContextMenu={onContextMenu}
		>
			<div className="min-w-0">
				<div className="flex min-w-0 items-center justify-between gap-3">
					<p className="truncate text-xs font-semibold tracking-[0.08em] text-muted-foreground">
						GENERATED SOUND
					</p>
					<div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
						<span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
						<span>Ready</span>
					</div>
				</div>
				<p className="mt-2 truncate text-base font-semibold text-foreground" title={title}>
					{title}
				</p>
			</div>

			<AudioPlayer src={src} className="rounded-lg border-border/50" />

			{onDownload ? (
				<Button
					type="button"
					variant="ghost"
					size="xs"
					className="self-start text-muted-foreground hover:text-foreground"
					aria-label="Save generated sound"
					onClick={onDownload}
				>
					<Download className="size-3.5" />
					{format ? `${format.toUpperCase()} audio` : 'Save audio'}
				</Button>
			) : format ? (
				<span className="text-xs text-muted-foreground">{format.toUpperCase()} audio</span>
			) : null}
		</div>
	);
}
