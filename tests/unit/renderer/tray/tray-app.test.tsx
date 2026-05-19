import { render, screen } from '@testing-library/react';
import { TrayApp } from '../../../../src/renderer/src/tray/TrayApp';

jest.mock('@/components/ui/dome-wave-animation', () => ({
	DomeWaveAnimation: ({ height, className }: { readonly height?: number; readonly className?: string }) => (
		<div data-testid="dome-wave-animation" data-height={height} className={className} />
	),
}));

describe('TrayApp', () => {
	it('renders only the dome wave animation', () => {
		render(<TrayApp />);

		expect(screen.getByLabelText('Friday tray wave')).toBeInTheDocument();
		expect(screen.getByTestId('dome-wave-animation')).toHaveAttribute('data-height', '72');
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
});
