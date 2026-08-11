import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Download, Pause, Play } from 'lucide-react';
import artwork from '@resources/icons/icon.png';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const WAVEFORM = [
	10, 14, 18, 12, 22, 16, 11, 20, 13, 24, 17, 10, 15, 21, 12, 18, 25, 14, 20, 11, 16, 22,
	13, 19, 10, 17, 23, 15, 20, 12, 18, 14,
] as const;

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
	readonly onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
}): React.JSX.Element {
	const playerRef = useRef<HTMLVideoElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [seekTime, setSeekTime] = useState<number | null>(null);

	useEffect(() => {
		setIsPlaying(false);
		setDuration(0);
		setCurrentTime(0);
		setSeekTime(null);
	}, [src]);

	const visibleTime = seekTime ?? currentTime;
	const progress = duration > 0 ? visibleTime / duration : 0;
	const elapsedSeconds = Math.max(0, Math.floor(visibleTime));
	const elapsedHours = Math.floor(elapsedSeconds / 3600);
	const elapsedMinutes = Math.floor((elapsedSeconds % 3600) / 60);
	const elapsedRemainder = elapsedSeconds % 60;
	const elapsedLabel =
		elapsedHours > 0
			? `${elapsedHours}:${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedRemainder).padStart(2, '0')}`
			: `${elapsedMinutes}:${String(elapsedRemainder).padStart(2, '0')}`;
	const durationSeconds = Math.max(0, Math.floor(duration));
	const durationHours = Math.floor(durationSeconds / 3600);
	const durationMinutes = Math.floor((durationSeconds % 3600) / 60);
	const durationRemainder = durationSeconds % 60;
	const durationLabel =
		durationHours > 0
			? `${durationHours}:${String(durationMinutes).padStart(2, '0')}:${String(durationRemainder).padStart(2, '0')}`
			: `${durationMinutes}:${String(durationRemainder).padStart(2, '0')}`;

	return (
		<div
			className={cn(
				'flex w-full min-w-0 gap-4 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm shadow-foreground/5',
				className
			)}
			onContextMenu={onContextMenu}
		>
			<ReactPlayer
				ref={playerRef}
				src={src}
				style={{ display: 'none' }}
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				onLoadedMetadata={(event) => {
					setDuration(
						Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0
					);
				}}
				onDurationChange={(event) => {
					setDuration(
						Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0
					);
				}}
				onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
				onEnded={() => setIsPlaying(false)}
			/>

			<div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-32">
				<img src={artwork} alt="" className="size-full object-cover" />
				<div className="absolute inset-0 bg-black/10" />
				<Button
					type="button"
					variant="ghost"
					size="icon-lg"
					className="absolute bottom-2 right-2 size-11 rounded-full border border-white/70 bg-white/95 text-black shadow-lg hover:bg-white"
					aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
					onClick={() => {
						const player = playerRef.current;
						if (!player) return;
						if (player.paused) void player.play();
						else player.pause();
					}}
				>
					{isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
				</Button>
			</div>

			<div className="flex min-w-0 flex-1 flex-col justify-between py-1">
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

				<div className="mt-3 min-w-0">
					<div className="relative flex h-8 items-center rounded-md focus-within:ring-2 focus-within:ring-ring/60">
						<div className="pointer-events-none absolute inset-0 flex items-center gap-1" aria-hidden="true">
							{WAVEFORM.map((height, index) => (
								<span
									key={`${height}-${index}`}
									className={cn(
										'min-w-1 flex-1 rounded-full transition-colors',
										index / WAVEFORM.length <= progress
											? 'bg-gradient-to-b from-fuchsia-400 to-blue-400'
											: 'bg-muted-foreground/35'
									)}
									style={{ height }}
								/>
							))}
						</div>
						<Slider
							value={[visibleTime]}
							max={duration || 1}
							step={0.1}
							aria-label="Seek generated sound"
							disabled={duration === 0}
							className="absolute inset-0 z-10 h-full cursor-pointer opacity-0"
							onValueChange={([value]) => {
								const player = playerRef.current;
								if (player) player.currentTime = value;
								setCurrentTime(value);
								setSeekTime(value);
							}}
							onValueCommit={([value]) => {
								setCurrentTime(value);
								setSeekTime(null);
							}}
						/>
					</div>
					<div className="mt-0.5 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
						<span>{elapsedLabel}</span>
						<span>{durationLabel}</span>
					</div>
				</div>

				<div className="mt-1 flex min-h-6 items-center">
					{onDownload ? (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className="-ml-2 text-muted-foreground hover:text-foreground"
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
			</div>
		</div>
	);
}
