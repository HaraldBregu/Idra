import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrayApp } from '../../../../src/renderer/src/tray/TrayApp';

describe('TrayApp', () => {
	let sendTrayChatMessage: jest.Mock;

	beforeEach(() => {
		sendTrayChatMessage = jest.fn(async () => undefined);
		Object.defineProperty(window, 'app', {
			configurable: true,
			value: {
				sendTrayChatMessage,
			},
		});
	});

	afterEach(() => {
		delete (window as Partial<Window>).app;
	});

	it('renders the tray action buttons', () => {
		render(<TrayApp />);

		expect(screen.getByRole('button', { name: 'Ask Friday' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'New Task' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Open App' })).toBeInTheDocument();
	});

	it('sends the tray chat message from the Ask Friday button', async () => {
		const user = userEvent.setup();
		render(<TrayApp />);

		await user.click(screen.getByRole('button', { name: 'Ask Friday' }));

		expect(sendTrayChatMessage).toHaveBeenCalledWith(
			'Hello Friday, I am sending this from the tray.'
		);
	});
});
