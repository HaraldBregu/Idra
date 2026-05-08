/** Workspace RTK listener effects — side-effect handlers for workspace actions. */
import { isAnyOf } from '@reduxjs/toolkit';
import { startAppListening } from '../listener-middleware';
import {
	importResourcesRequested,
	importResourcesCompleted,
	handleWorkspaceChanged,
} from './reducer';
import {
	loadResources,
	loadDocuments,
	loadProjectName,
	selectWorkspace,
	createWorkspace,
} from './actions';

/**
 * Listener: when `importResourcesRequested` is dispatched, call the IPC
 * method to open the file picker and import files into the workspace.
 *
 * After the import resolves we explicitly reload the resources list.
 * We cannot rely on the file watcher bridge in App.tsx for this because
 * DocumentsService calls watcher.markFileAsWritten() before each copy,
 * which causes DocumentsWatcherService to suppress the resulting 'add'
 * event and never broadcast it to the renderer.
 */
startAppListening({
	actionCreator: importResourcesRequested,
	effect: async (action, listenerApi) => {
		const extensions = action.payload;
		try {
			const imported = await window.app.workspace.insertResources(extensions);
			if (imported.length > 0) {
				await listenerApi.dispatch(loadResources());
			}
		} catch {
			// Swallow picker-cancellation and validation errors; the UI
			// already shows an Electron dialog for validation failures.
		} finally {
			listenerApi.dispatch(importResourcesCompleted());
		}
	},
});

/**
 * Listener: reload workspace-scoped data whenever the active workspace changes.
 *
 * Fires on both paths:
 *   - `handleWorkspaceChanged` — broadcast from the main process via
 *     `window.app.workspace.onChange` (external switch, e.g. another window).
 *   - `selectWorkspace.fulfilled` — programmatic switch from this renderer
 *     (Layout picker, WelcomePage).
 *
 * Skips reloads when the new `currentPath` is null (cleared/deleted); the
 * relevant reducers already reset the documents/resources state in that case.
 */
startAppListening({
	matcher: isAnyOf(
		handleWorkspaceChanged,
		selectWorkspace.fulfilled,
		createWorkspace.fulfilled
	),
	effect: async (_action, { dispatch, getState }) => {
		const currentPath = (getState() as { workspace: { currentPath: string | null } }).workspace
			.currentPath;
		if (!currentPath) return;
		await Promise.all([
			dispatch(loadDocuments()),
			dispatch(loadResources()),
			dispatch(loadProjectName()),
		]);
	},
});
