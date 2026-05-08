import { useEffect } from 'react';
import { useAppDispatch } from '@/store';
import { handleWorkspaceChanged } from '@/store/workspace/reducer';
import type { WorkspaceChangedEvent } from '../../../shared/types';

/**
 * Hook to listen for workspace change events from the main process.
 * Dispatches handleWorkspaceChanged action when the workspace changes.
 *
 * Should be called from a top-level component like AppLayout to ensure
 * the listener is active for the entire app session.
 *
 * Side-effects (reloading documents, resources, indexing info, project name)
 * are handled by the workspace listener middleware reacting to the
 * `handleWorkspaceChanged` / `selectWorkspace.fulfilled` actions.
 */
export function useWorkspaceListener(): void {
	const dispatch = useAppDispatch();

	useEffect(() => {
		const unsubscribe = window.app.workspace.onChange((event: WorkspaceChangedEvent) => {
			dispatch(handleWorkspaceChanged(event));
		});

		return () => {
			unsubscribe();
		};
	}, [dispatch]);
}
