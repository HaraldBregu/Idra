import { fireEvent, render, screen } from '@testing-library/react';
import { SoundPlayer } from '@/components/sound-player';

jest.mock('@resources/icons/icon.png', () => 'sound-artwork.png');

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
		const audio = container.querySelector('audio');

		expect(screen.getByText('GENERATED SOUND')).toBeInTheDocument();
		expect(screen.getByText('Launch soundtrack')).toBeInTheDocument();
		expect(screen.getByText('Ready')).toBeInTheDocument();
		expect(screen.getByText('WAV audio')).toBeInTheDocument();
		expect(audio).not.toBeNull();

		Object.defineProperty(audio, 'duration', { configurable: true, value: 168 });
		fireEvent.loadedMetadata(audio!);

		expect(screen.getByText('2:48')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Save generated sound' }));
		expect(onDownload).toHaveBeenCalledTimes(1);
	});

	it('plays and seeks the generated sound', () => {
		const { container } = render(
			<SoundPlayer src="local-resource://file/launch.wav" title="Launch soundtrack" />
		);
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
		Object.defineProperty(audio, 'paused', { configurable: true, value: true });
		audio!.play = jest.fn().mockResolvedValue(undefined);
		fireEvent.loadedMetadata(audio!);

		fireEvent.click(screen.getByRole('button', { name: 'Play Launch soundtrack' }));
		expect(audio!.play).toHaveBeenCalledTimes(1);
		fireEvent.play(audio!);
		expect(screen.getByRole('button', { name: 'Pause Launch soundtrack' })).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Seek generated sound'), {
			target: { value: '42' },
		});
		expect(currentTime).toBe(42);
		expect(screen.getByText('0:42')).toBeInTheDocument();
	});
});
