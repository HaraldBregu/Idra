import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PromptEditor } from '@/components/prompt-editor';

jest.mock('@/components/ui/bar-wave-animation', () => ({
	BarWaveAnimation: () => <div data-testid="voice-waveform" />,
}));

jest.mock('@/components/persona', () => ({
	Persona: ({ state }: { state: string }) => <div data-testid="persona" data-state={state} />,
}));

jest.mock('@/components/text-editor', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		TextEditor: ({
			value,
			onEditorReady,
			onVisualLineChange,
			className,
		}: {
			value?: string;
			onEditorReady?: (editor: { view: { dom: HTMLDivElement } }) => void;
			onVisualLineChange?: (hasMultipleLines: boolean) => void;
			className?: string;
		}) =>
			React.createElement(
				'div',
				{ className },
				React.createElement(
					'div',
					{
						ref: (element: HTMLDivElement | null) => {
							if (!element) return;
							onEditorReady?.({ view: { dom: element } });
							onVisualLineChange?.(Boolean(value && value.length > 40));
						},
						role: 'textbox',
					},
					value
				)
			),
	};
});

describe('PromptEditor', () => {
	it('expands when text wraps to another visual line and collapses when cleared', async () => {
		const { container, rerender } = render(
			<PromptEditor
				value=""
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
			/>
		);
		const prompt = container.querySelector('[data-expanded]');

		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'false'));
		expect(prompt).toHaveClass('min-h-14');
		expect(prompt).toHaveClass('rounded-full');
		await waitFor(() => expect(prompt).toHaveStyle({ borderRadius: '28px' }));

		rerender(
			<PromptEditor
				value={'A long prompt that needs more vertical space. '.repeat(3)}
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
			/>
		);
		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'true'));
		expect(prompt).toHaveClass('min-h-24');
		expect(prompt).toHaveClass('rounded-xl');
		await waitFor(() => expect(prompt).toHaveStyle({ borderRadius: '12px' }));

		rerender(
			<PromptEditor
				value=""
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
			/>
		);
		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'false'));
		expect(prompt).toHaveClass('min-h-14');
		expect(prompt).toHaveClass('rounded-full');
		await waitFor(() => expect(prompt).toHaveStyle({ borderRadius: '28px' }));
	});

	it('announces realtime voice status and exposes mute and end controls', () => {
		const onMutedChange = jest.fn();
		const onVoiceEnd = jest.fn();
		const { container } = render(
			<PromptEditor
				value=""
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
				voiceMode="conversation"
				voiceStatus="Friday is speaking…"
				voicePersonaState="speaking"
				voiceMuted={false}
				onVoiceMutedChange={onMutedChange}
				onVoiceEnd={onVoiceEnd}
			/>
		);

		expect(screen.getByRole('status')).toHaveTextContent('Friday is speaking…');
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		expect(screen.getByTestId('persona')).toHaveAttribute('data-state', 'speaking');
		expect(container.querySelector('[data-voice-mode="conversation"]')).toHaveClass(
			'rounded-[1.75rem]'
		);
		fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
		fireEvent.click(screen.getByRole('button', { name: 'End voice conversation' }));
		expect(onMutedChange).toHaveBeenCalledWith(true);
		expect(onVoiceEnd).toHaveBeenCalled();
	});
});
