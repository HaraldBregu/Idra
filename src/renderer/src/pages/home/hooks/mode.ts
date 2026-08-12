import { useCallback, useEffect, useState } from 'react';
import type { AgentInteractionMode } from '@/lib/compat';

const STORAGE_KEY = 'friday-interaction-modes';

function readModes(): Record<string, AgentInteractionMode> {
	try {
		const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown;
		if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
		return Object.fromEntries(
			Object.entries(value).filter((entry): entry is [string, AgentInteractionMode] =>
				entry[1] === 'default' || entry[1] === 'plan'
			)
		);
	} catch {
		return {};
	}
}

function writeModes(modes: Record<string, AgentInteractionMode>): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
	} catch {
		/* empty */
	}
}

export function useInteractionMode(sessionId: string) {
	const [interactionMode, setInteractionModeState] = useState<AgentInteractionMode>(
		() => readModes()[sessionId] ?? 'default'
	);

	useEffect(() => {
		setInteractionModeState(readModes()[sessionId] ?? 'default');
	}, [sessionId]);

	const setInteractionMode = useCallback(
		(mode: AgentInteractionMode): void => {
			const modes = readModes();
			modes[sessionId] = mode;
			writeModes(modes);
			setInteractionModeState(mode);
		},
		[sessionId]
	);

	const migrateInteractionMode = useCallback(
		(resolvedSessionId: string): void => {
			if (resolvedSessionId === sessionId) return;
			const modes = readModes();
			const mode = modes[sessionId] ?? interactionMode;
			delete modes[sessionId];
			modes[resolvedSessionId] = mode;
			writeModes(modes);
		},
		[interactionMode, sessionId]
	);

	return { interactionMode, setInteractionMode, migrateInteractionMode };
}
