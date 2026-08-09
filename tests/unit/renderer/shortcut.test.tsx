import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useShortcut } from '../../../src/renderer/src/hooks/shortcut';
import { ShortcutId } from '../../../src/shared/app_types';

it('opens the settings page when the settings shortcut is received', () => {
	let shortcutHandler: ((id: ShortcutId) => void) | undefined;
	const unsubscribe = jest.fn();
	const onShortcut = jest.fn((handler: (id: ShortcutId) => void) => {
		shortcutHandler = handler;
		return unsubscribe;
	});
	Object.defineProperty(window, 'app', {
		configurable: true,
		value: { onShortcut },
	});

	function TestRoute(): React.JSX.Element {
		useShortcut();
		return <p>{useLocation().pathname}</p>;
	}

	const view = render(
		<MemoryRouter initialEntries={['/home']}>
			<TestRoute />
		</MemoryRouter>
	);

	act(() => shortcutHandler?.(ShortcutId.openSettings));

	expect(screen.getByText('/settings')).toBeInTheDocument();
	view.unmount();
	expect(unsubscribe).toHaveBeenCalledTimes(1);
});
