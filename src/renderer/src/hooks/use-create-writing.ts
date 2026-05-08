import { useCallback, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { SaveOutputResult } from '../../../shared/types';

export interface UseCreateWritingOptions {
	/** Called immediately after the workspace IPC resolves, before navigation. */
	onCreated?: (result: SaveOutputResult) => void;
}

export interface UseCreateWritingResult {
	createWriting: () => Promise<void>;
	isCreating: boolean;
	error: string | null;
	clearError: () => void;
}

/**
 * Encapsulates the "New Writing" creation flow:
 *   1. Calls window.app.workspace.saveOutput to persist the folder on disk.
 *   2. Invokes options.onCreated with the result (if provided) so callers
 *      can optimistically update their UI before the file-watcher fires.
 *   3. Navigates to the assistant settings page on success.
 *
 * Uses a ref-based in-flight guard so rapid successive clicks are ignored
 * without requiring the caller to track the loading state in their own
 * dependency array.
 */
export function useCreateWriting(options?: UseCreateWritingOptions): UseCreateWritingResult {
	const navigate = useNavigate();
	const inFlightRef = useRef(false);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Keep options in a ref so the createWriting callback never needs to be
	// recreated when the caller's onCreated identity changes.
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const createWriting = useCallback(async () => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		setIsCreating(true);
		setError(null);

		try {
			const result = await window.app.workspace.saveOutput({
				type: 'documents',
				content: '',
				metadata: { title: '' },
			});

			// Notify caller immediately — before navigation — so the sidebar list
			// can be updated optimistically without waiting for the file watcher.
			optionsRef.current?.onCreated?.(result);

			navigate({ to: '/settings/assistant' });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create writing.';
			setError(message);
		} finally {
			setIsCreating(false);
			inFlightRef.current = false;
		}
	}, [navigate]);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return { createWriting, isCreating, error, clearError };
}
