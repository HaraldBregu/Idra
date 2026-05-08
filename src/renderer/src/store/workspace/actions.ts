/** Workspace async thunks — IPC calls for loading, selecting, and clearing workspaces. */
import { createAsyncThunk } from '@reduxjs/toolkit';
import type {
	CreateWorkspaceParams,
	ResourceInfo,
	WorkspaceInfo,
} from '../../../../shared/types';
import type { AppDispatch } from '../index';
import type { DocumentItem } from './types';
import {
	documentsLoadingStarted,
	documentsLoaded,
	documentsLoadingFailed,
	documentUpdated,
} from './reducer';

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

/**
 * Load the current workspace path from the main process.
 * Called once on app startup to hydrate the Redux store.
 */
export const loadCurrentWorkspace = createAsyncThunk('workspace/loadCurrent', async () => {
	const currentPath = await window.app.workspace.getCurrent();
	return currentPath;
});

/**
 * Load every managed workspace from `{userData}/workspaces/`.
 */
export const listWorkspaces = createAsyncThunk<WorkspaceInfo[]>(
	'workspace/list',
	async () => {
		return await window.app.workspace.list();
	}
);

/**
 * Set the current workspace by path.
 * Updates both the main process and the Redux store.
 */
export const selectWorkspace = createAsyncThunk(
	'workspace/select',
	async (workspacePath: string) => {
		await window.app.workspace.setCurrent(workspacePath);
		return workspacePath;
	}
);

/**
 * Create a new managed workspace and immediately switch to it.
 * Returns the newly created workspace info.
 */
export const createWorkspace = createAsyncThunk<WorkspaceInfo, CreateWorkspaceParams>(
	'workspace/create',
	async (params) => {
		const info = await window.app.workspace.create(params);
		await window.app.workspace.setCurrent(info.path);
		return info;
	}
);

/**
 * Clear the current workspace.
 */
export const clearWorkspace = createAsyncThunk('workspace/clear', async () => {
	await window.app.workspace.clear();
	return null;
});

// ---------------------------------------------------------------------------
// Project info thunks
// ---------------------------------------------------------------------------

/**
 * Load the project name and description from workspace metadata.
 */
export const loadProjectName = createAsyncThunk<{
	name: string | null;
	description: string | null;
}>('workspace/loadProjectName', async () => {
	const info = await window.app.workspace.getProjectInfo();
	return {
		name: info?.name ?? null,
		description: info?.description ?? null,
	};
});

// ---------------------------------------------------------------------------
// Resource thunks
// ---------------------------------------------------------------------------

/**
 * Load all resources from the current workspace.
 */
export const loadResources = createAsyncThunk<ResourceInfo[]>(
	'workspace/loadResources',
	async () => {
		return await window.app.workspace.getResources();
	}
);

/**
 * Remove resources by their IDs, then reload the full list.
 */
export const removeResources = createAsyncThunk<ResourceInfo[], string[]>(
	'workspace/removeResources',
	async (ids) => {
		await Promise.all(ids.map((id) => window.app.workspace.deleteResource(id)));
		return await window.app.workspace.getResources();
	}
);

// ---------------------------------------------------------------------------
// Document item thunks (merged from former documents slice)
// ---------------------------------------------------------------------------

function toDocumentItem(f: {
	id: string;
	path: string;
	metadata: { title?: string };
	savedAt: number;
}): DocumentItem {
	return {
		id: f.id,
		title: (f.metadata.title as string) || '',
		path: f.path,
		createdAt: f.savedAt,
		updatedAt: f.savedAt,
	};
}

export const loadDocuments = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
	'workspace/loadDocuments',
	async (_, { dispatch }) => {
		dispatch(documentsLoadingStarted());
		try {
			const files = await window.app.workspace.loadOutputsByType('documents');
			dispatch(documentsLoaded(files.map(toDocumentItem)));
		} catch (err) {
			dispatch(documentsLoadingFailed(err instanceof Error ? err.message : String(err)));
		}
	}
);

export const refreshDocument = createAsyncThunk<void, string, { dispatch: AppDispatch }>(
	'workspace/refreshDocument',
	async (id, { dispatch }) => {
		try {
			const file = await window.app.workspace.loadOutput({ type: 'documents', id });
			if (file) dispatch(documentUpdated(toDocumentItem(file)));
		} catch {
			// silently ignore — stale state is acceptable for a single refresh
		}
	}
);
