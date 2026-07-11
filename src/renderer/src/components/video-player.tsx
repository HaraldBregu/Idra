import type { ComponentProps, ReactElement } from 'react';

type VideoPlayerProps = ComponentProps<'video'> & {
	readonly onOpenFile?: () => void;
};

export function VideoPlayer({ onFullscreenChange, onOpenFile, ...props }: VideoPlayerProps): ReactElement {
	const handleFullscreenChange: ComponentProps<'video'>['onFullscreenChange'] = (event) => {
		onFullscreenChange?.(event);
		if (!onOpenFile || document.fullscreenElement !== event.currentTarget) return;

		void document.exitFullscreen().catch(() => undefined);
		onOpenFile();
	};

	return <video {...props} onFullscreenChange={handleFullscreenChange} />;
}
