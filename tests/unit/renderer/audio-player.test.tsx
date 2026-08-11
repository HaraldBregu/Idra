import { render } from '@testing-library/react';
import { AudioPlayer } from '@/components/audio-player';

describe('AudioPlayer', () => {
	it('uses the video player controls without a visual media surface', () => {
		const { container } = render(<AudioPlayer src="local-resource://file/audio.mp3" />);

		expect(container.querySelector('media-controller')).toHaveAttribute('audio');
		expect(container.querySelector('audio')).toHaveAttribute(
			'src',
			'local-resource://file/audio.mp3'
		);
		expect(container.querySelector('video')).not.toBeInTheDocument();
		expect(container.querySelector('media-play-button')).toBeInTheDocument();
		expect(container.querySelector('media-time-range')).toBeInTheDocument();
		expect(container.querySelector('media-time-display')).toBeInTheDocument();
		expect(container.querySelector('media-mute-button')).toBeInTheDocument();
		expect(container.querySelector('media-fullscreen-button')).not.toBeInTheDocument();
	});

	it('updates the native audio source', () => {
		const { container, rerender } = render(
			<AudioPlayer src="local-resource://file/first.mp3" />
		);

		rerender(<AudioPlayer src="local-resource://file/second.mp3" />);

		expect(container.querySelector('audio')).toHaveAttribute(
			'src',
			'local-resource://file/second.mp3'
		);
	});
});
