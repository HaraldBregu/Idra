import { fireEvent, render, screen } from '@testing-library/react';
import { AudioPlayer } from '@/components/audio-player';

jest.mock('react-player', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		__esModule: true,
		default: React.forwardRef(function MockPlayer(
			props: object,
			ref: React.ForwardedRef<HTMLAudioElement>
		) {
			return React.createElement('audio', { ...props, ref });
		}),
	};
});

jest.mock('@/components/ui/slider', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		Slider: ({
			value,
			onValueChange,
			onValueCommit,
			...props
		}: {
			value: number[];
			onValueChange: (value: number[]) => void;
			onValueCommit: (value: number[]) => void;
		}) =>
			React.createElement('input', {
				...props,
				type: 'range',
				value: value[0],
				onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
					onValueChange([Number(event.target.value)]),
				onMouseUp: (event: React.MouseEvent<HTMLInputElement>) =>
					onValueCommit([Number(event.currentTarget.value)]),
			}),
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

	it('seeks audio while the slider moves', () => {
		const { container } = render(<AudioPlayer src="local-resource://file/audio.mp3" />);
		const audio = container.querySelector('audio');
		let currentTime = 0;

		expect(audio).not.toBeNull();
		Object.defineProperty(audio, 'duration', { configurable: true, value: 120 });
		Object.defineProperty(audio, 'currentTime', {
			configurable: true,
			get: () => currentTime,
			set: (value: number) => {
				currentTime = value;
			},
		});
		fireEvent.loadedMetadata(audio!);
		fireEvent.change(screen.getByLabelText('Seek'), { target: { value: '90' } });

		expect(currentTime).toBe(90);
		expect(screen.getByText('1:30')).toBeInTheDocument();
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
