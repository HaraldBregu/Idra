import { useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const minutes = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function AudioPlayer({
	src,
	className,
	onContextMenu,
}: {
	readonly src: string;
	readonly className?: string;
	readonly onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
}): React.JSX.Element {
	const playerRef = useRef<HTMLVideoElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);

	const togglePlay = (): void => {
		const player = playerRef.current;
		if (!player) return;
		if (player.paused) void player.play();
		else player.pause();
	};

	return (
		<div
			className={cn(
				'flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2',
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
				onDurationChange={() => setDuration(playerRef.current?.duration ?? 0)}
				onTimeUpdate={() => setCurrentTime(playerRef.current?.currentTime ?? 0)}
				onEnded={() => setIsPlaying(false)}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				className="shrink-0 text-muted-foreground hover:text-foreground"
				aria-label={isPlaying ? 'Pause' : 'Play'}
				onClick={togglePlay}
			>
				{isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
			</Button>
			<span className="text-xs tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
			<Slider
				value={[currentTime]}
				max={duration || 1}
				step={0.1}
				aria-label="Seek"
				onValueChange={([value]) => {
					const player = playerRef.current;
					if (player) player.currentTime = value;
				}}
			/>
			<span className="text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</span>
		</div>
	);
}
