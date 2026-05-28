import type React from 'react';
import { render, screen } from '@testing-library/react';
import {
	PromptInput,
	PromptInputTextarea,
} from '../../../../../src/renderer/src/components/ui/prompt-input';

jest.mock('motion/react', () => ({
	AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
	motion: {
		div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
			<div {...props}>{children}</div>
		),
	},
	useReducedMotion: () => true,
}));

jest.mock('@/components/ui/bar-wave-animation', () => ({
	BarWaveAnimation: () => <div data-testid="bar-wave" />,
}));

jest.mock('@/components/ui/wave-animation', () => ({
	WaveAnimation: () => <div data-testid="wave" />,
}));

describe('PromptInput', () => {
	it('keeps dictated text visible in the prompt while dictation controls are shown', () => {
		render(
			<PromptInput
				value="spoken words"
				onValueChange={jest.fn()}
				leadingAction={<button type="button">Attach</button>}
				actions={<button type="button">Send</button>}
				voiceMode="dictation"
				voiceElapsedMs={1_250}
				onVoiceCancel={jest.fn()}
				onVoiceConfirm={jest.fn()}
			>
				<PromptInputTextarea aria-label="Message Friday" />
			</PromptInput>
		);

		expect(screen.getByRole('textbox', { name: 'Message Friday' })).toHaveValue(
			'spoken words'
		);
		expect(screen.getByRole('button', { name: 'Cancel dictation' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Confirm dictation' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
	});
});
