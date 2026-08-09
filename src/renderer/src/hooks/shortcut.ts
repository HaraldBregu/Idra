import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShortcutId } from '@shared/app_types';

export function useShortcut(): void {
	const navigate = useNavigate();

	useEffect(
		() =>
			window.app.onShortcut((id) => {
				if (id === ShortcutId.openSettings) navigate('/settings');
			}),
		[navigate]
	);
}
