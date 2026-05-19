import { render, screen } from '@testing-library/react';
import { TrayApp } from '../../../../src/renderer/src/tray/TrayApp';

describe('TrayApp', () => {
	it('renders the tray action buttons', () => {
		render(<TrayApp />);

		expect(screen.getByRole('button', { name: 'Ask Friday' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'New Task' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Open App' })).toBeInTheDocument();
	});
});
