import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { WorkspaceDeletedEvent } from '../../../shared/types';

type DeletionReason = WorkspaceDeletedEvent['reason'] | null;

type Listener = (reason: DeletionReason) => void;

let currentDeletionReason: DeletionReason = null;
const listeners = new Set<Listener>();

function setDeletionReason(reason: DeletionReason): void {
	currentDeletionReason = reason;
	for (const listener of listeners) {
		listener(reason);
	}
}

function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Hook that monitors the workspace for external deletion and redirects
 * to the Welcome page when the workspace folder is no longer accessible.
 */
export function useWorkspaceValidation(): void {
	const navigate = useNavigate();
	const deletionReason = useWorkspaceDeletionReason();
	const hasHandledDeletion = useRef(false);

	useEffect(() => {
		const unsubscribe = window.app.workspace.onDeleted((event: WorkspaceDeletedEvent) => {
			console.warn(
				'[useWorkspaceValidation] Workspace deleted:',
				event.deletedPath,
				'reason:',
				event.reason
			);
			setDeletionReason(event.reason);
		});

		return () => {
			unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (deletionReason && !hasHandledDeletion.current) {
			hasHandledDeletion.current = true;
			navigate({ to: '/', replace: true });
		}

		if (!deletionReason) {
			hasHandledDeletion.current = false;
		}
	}, [deletionReason, navigate]);
}

export function useWorkspaceDeletionReason(): DeletionReason {
	const [reason, setReason] = useState<DeletionReason>(currentDeletionReason);

	useEffect(() => {
		return subscribe(setReason);
	}, []);

	return reason;
}

export function useClearDeletionReason(): () => void {
	return useCallback(() => {
		setDeletionReason(null);
	}, []);
}
