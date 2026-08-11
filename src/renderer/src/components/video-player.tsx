import { useEffect, useRef, type ComponentProps, type ReactElement } from 'react';
import {
	VideoPlayer as VideoPlayerRoot,
	VideoPlayerContent,
	VideoPlayerControlBar,
	VideoPlayerFullscreenButton,
	VideoPlayerMuteButton,
	VideoPlayerPlayButton,
	VideoPlayerTimeDisplay,
	VideoPlayerTimeRange,
} from '@/components/kibo-ui/video-player';
import { cn } from '@/lib/utils';

type VideoPlayerProps = ComponentProps<'video'> & {
	readonly onOpenFile?: () => void;
};

export function VideoPlayer({
	onOpenFile,
	controls,
	className,
	preload = 'metadata',
	...props
}: VideoPlayerProps): ReactElement {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !onOpenFile) return;

		const handleFullscreenChange = (): void => {
			if (!document.fullscreenElement?.contains(video)) return;
			void document.exitFullscreen().catch(() => undefined);
			onOpenFile();
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	}, [onOpenFile]);

	return (
		<VideoPlayerRoot
			className={cn(
				'aspect-video w-full overflow-hidden rounded-xl border border-border',
				className
			)}
		>
			<VideoPlayerContent
				ref={videoRef}
				className="size-full object-contain"
				preload={preload}
				slot="media"
				{...props}
			/>
			{controls && (
				<VideoPlayerControlBar>
					<VideoPlayerPlayButton />
					<VideoPlayerTimeRange />
					<VideoPlayerTimeDisplay />
					<VideoPlayerMuteButton />
					{onOpenFile && <VideoPlayerFullscreenButton />}
				</VideoPlayerControlBar>
			)}
		</VideoPlayerRoot>
	);
}
