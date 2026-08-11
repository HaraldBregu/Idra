import { render, waitFor } from '@testing-library/react';
import { Persona } from '../../../src/renderer/src/components/ai-elements/persona';

const mockSetRgb = jest.fn();

jest.mock('@rive-app/react-webgl2', () => ({
	useRive: () => ({ rive: {}, RiveComponent: () => null }),
	useStateMachineInput: () => null,
	useViewModel: () => ({}),
	useViewModelInstance: () => ({}),
	useViewModelInstanceColor: () => ({ setRgb: mockSetRgb }),
}));

beforeAll(() => {
	Object.defineProperty(window, 'requestAnimationFrame', {
		configurable: true,
		value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0),
	});
	Object.defineProperty(window, 'cancelAnimationFrame', {
		configurable: true,
		value: (id: number) => window.clearTimeout(id),
	});
});

it('does not reapply the dynamic color when only the persona state changes', async () => {
	const { rerender } = render(<Persona variant="halo" state="idle" />);

	await waitFor(() => expect(mockSetRgb).toHaveBeenCalledTimes(1));
	rerender(<Persona variant="halo" state="listening" />);

	expect(mockSetRgb).toHaveBeenCalledTimes(1);
});
