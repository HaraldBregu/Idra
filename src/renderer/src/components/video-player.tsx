import { type ComponentProps, type ReactElement } from 'react';
import { Maximize } from 'lucide-react';
import {
	VideoPlayer as VideoPlayerRoot,
	VideoPlayerContent,
	VideoPlayerControlBar,
	VideoPlayerMuteButton,
	VideoPlayerPlayButton,
	VideoPlayerTimeDisplay,
	VideoPlayerTimeRange,
} from '@/components/kibo-ui/video-player';
import { Button } from '@/components/ui/button';
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
	return (
		<VideoPlayerRoot
			className={cn(
				'aspect-video w-full overflow-hidden rounded-xl border border-border',
				className
			)}
		>
			<VideoPlayerContent
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
					{onOpenFile && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-auto self-stretch rounded-none border-0 bg-background p-2.5 text-foreground hover:bg-accent hover:text-accent-foreground"
							aria-label="Open video"
							title="Open video"
							onClick={onOpenFile}
						>
							<Maximize className="size-5" />
						</Button>
					)}
				</VideoPlayerControlBar>
			)}
		</VideoPlayerRoot>
	);
}
