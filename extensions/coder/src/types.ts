import type { Dispatch, SetStateAction } from 'react';

export type RunState = 'idle' | 'running' | 'approval' | 'error';

export interface CoderMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	status?: 'streaming' | 'complete' | 'error';
}

export interface CoderActivity {
	id: string;
	name: string;
	status: 'running' | 'ok' | 'error' | 'blocked';
	detail: string;
	durationMs?: number;
}

export interface CoderSession {
	id: string;
	title: string;
	createdAtMs: number;
}

export interface CoderPermission {
	approvalId: string;
	runId: string;
	toolName: string;
	inputFingerprint: string;
	detail: string;
	targets: string[];
}

export interface CoderController {
	activities: CoderActivity[];
	activeSessionId: string;
	activeSessionTitle: string;
	error: string;
	input: string;
	isPreview: boolean;
	leftOpen: boolean;
	messages: CoderMessage[];
	modelId: string;
	permission: CoderPermission | null;
	runLabel: string;
	runState: RunState;
	sessions: CoderSession[];
	sessionsLoading: boolean;
	workspaceLocation: string;
	workspaceName: string;
	approvePermission: (decision: 'approve' | 'reject' | 'approve_always') => Promise<void>;
	cancelRun: () => void;
	createSession: () => void;
	selectSession: (sessionId: string) => Promise<void>;
	send: () => Promise<void>;
	setInput: Dispatch<SetStateAction<string>>;
	setLeftOpen: Dispatch<SetStateAction<boolean>>;
}
