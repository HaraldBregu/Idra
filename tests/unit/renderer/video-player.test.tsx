import { fireEvent, render, screen } from '@testing-library/react';
import { VideoPlayer } from '@/components/video-player';

jest.mock('@/components/kibo-ui/video-player', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		VideoPlayer: (props: object) => React.createElement('media-controller', props),
		VideoPlayerContent: (props: object) => React.createElement('video', props),
		VideoPlayerControlBar: (props: object) => React.createElement('media-control-bar', props),
		VideoPlayerMuteButton: (props: object) => React.createElement('media-mute-button', props),
		VideoPlayerPlayButton: (props: object) => React.createElement('media-play-button', props),
		VideoPlayerTimeDisplay: (props: object) => React.createElement('media-time-display', props),
		VideoPlayerTimeRange: (props: object) => React.createElement('media-time-range', props),
	};
});

describe('VideoPlayer', () => {
	it('opens the video file directly from the fullscreen control', () => {
		const onOpenFile = jest.fn();
		const requestFullscreen = jest.fn();
		Object.defineProperty(HTMLVideoElement.prototype, 'requestFullscreen', {
			configurable: true,
			value: requestFullscreen,
		});

		const { container } = render(
			<VideoPlayer src="local-resource://file/video.mp4" controls onOpenFile={onOpenFile} />
		);

		fireEvent.click(screen.getByRole('button', { name: 'Open video' }));

		expect(onOpenFile).toHaveBeenCalledTimes(1);
		expect(requestFullscreen).not.toHaveBeenCalled();
		expect(container.querySelector('media-fullscreen-button')).not.toBeInTheDocument();
	});
});
