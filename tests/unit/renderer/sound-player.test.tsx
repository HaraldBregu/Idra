import { fireEvent, render, screen } from '@testing-library/react';
import { SoundPlayer } from '@/components/sound-player';

describe('SoundPlayer', () => {
	it('shows generated sound metadata and opens the save action', () => {
		const onDownload = jest.fn();
		const { container } = render(
			<SoundPlayer
				src="local-resource://file/launch.wav"
				title="Launch soundtrack"
				format="wav"
				onDownload={onDownload}
			/>
		);

		expect(screen.getByText('GENERATED SOUND')).toBeInTheDocument();
		expect(screen.getByText('Launch soundtrack')).toBeInTheDocument();
		expect(screen.getByText('Ready')).toBeInTheDocument();
		expect(screen.getByText('WAV audio')).toBeInTheDocument();
		expect(container.querySelector('img')).not.toBeInTheDocument();
		expect(container.querySelector('audio')).toHaveAttribute(
			'src',
			'local-resource://file/launch.wav'
		);

		fireEvent.click(screen.getByRole('button', { name: 'Save generated sound' }));
		expect(onDownload).toHaveBeenCalledTimes(1);
	});

	it('uses the shared video player controls', () => {
		const { container } = render(
			<SoundPlayer src="local-resource://file/launch.wav" title="Launch soundtrack" />
		);

		expect(container.querySelector('media-controller')).toHaveAttribute('audio');
		expect(container.querySelector('media-play-button')).toBeInTheDocument();
		expect(container.querySelector('media-time-range')).toBeInTheDocument();
		expect(container.querySelector('media-time-display')).toBeInTheDocument();
		expect(container.querySelector('media-mute-button')).toBeInTheDocument();
		expect(container.querySelector('media-fullscreen-button')).not.toBeInTheDocument();
	});
});
