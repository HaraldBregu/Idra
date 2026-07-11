import { useEffect, useRef, type ComponentProps, type ReactElement } from 'react';

type VideoPlayerProps = ComponentProps<'video'> & {
	readonly onOpenFile?: () => void;
};

export function VideoPlayer({ onOpenFile, ...props }: VideoPlayerProps): ReactElement {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !onOpenFile) return;

		const handleFullscreenChange = (): void => {
			if (document.fullscreenElement !== video) return;
			void document.exitFullscreen().catch(() => undefined);
			onOpenFile();
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	}, [onOpenFile]);

	return <video ref={videoRef} {...props} />;
}
