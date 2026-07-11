import { fireEvent, render, screen } from '@testing-library/react';
import { AudioPlayer } from '@/components/audio-player';

jest.mock('react-player', () => {
	const React = require('react');
	return {
		__esModule: true,
		default: React.forwardRef((props: object, ref: React.ForwardedRef<HTMLAudioElement>) =>
			React.createElement('audio', { ...props, ref })
		),
	};
});

describe('AudioPlayer', () => {
	it('shows hour-based timestamps for long audio files', () => {
		const { container } = render(<AudioPlayer src="local-resource://file/audio.mp3" />);
		const audio = container.querySelector('audio');

		expect(audio).not.toBeNull();
		Object.defineProperty(audio, 'duration', { configurable: true, value: 3661 });
		fireEvent.loadedMetadata(audio!);

		expect(screen.getByText('1:01:01')).toBeInTheDocument();
		expect(screen.getByLabelText('Seek')).toBeEnabled();
	});

	it('clears the previous track progress when the source changes', () => {
		const { container, rerender } = render(<AudioPlayer src="local-resource://file/first.mp3" />);
		const audio = container.querySelector('audio');

		expect(audio).not.toBeNull();
		Object.defineProperty(audio, 'duration', { configurable: true, value: 120 });
		Object.defineProperty(audio, 'currentTime', { configurable: true, value: 60 });
		fireEvent.loadedMetadata(audio!);
		fireEvent.timeUpdate(audio!);
		expect(screen.getByText('1:00')).toBeInTheDocument();

		rerender(<AudioPlayer src="local-resource://file/second.mp3" />);

		expect(screen.getAllByText('0:00')).toHaveLength(2);
		expect(screen.getByLabelText('Seek')).toBeDisabled();
	});
});
