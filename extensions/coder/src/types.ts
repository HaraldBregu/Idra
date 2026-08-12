import type { Dispatch, SetStateAction } from 'react';

export type RunState = 'idle' | 'running' | 'approval' | 'error';
export type InspectorTab = 'changes' | 'context' | 'activity';

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
	path?: string;
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
	changedFiles: string[];
	error: string;
	input: string;
	inspectorTab: InspectorTab;
	isPreview: boolean;
	leftOpen: boolean;
	messages: CoderMessage[];
	modelId: string;
	permission: CoderPermission | null;
	rightOpen: boolean;
	runLabel: string;
	runState: RunState;
	selectedFileContent: string;
	selectedFilePath: string;
	sessions: CoderSession[];
	sessionsLoading: boolean;
	workspaceLocation: string;
	workspaceName: string;
	approvePermission: (decision: 'approve' | 'reject' | 'approve_always') => Promise<void>;
	cancelRun: () => void;
	createSession: () => void;
	selectFile: (path: string) => Promise<void>;
	selectSession: (sessionId: string) => Promise<void>;
	send: () => Promise<void>;
	setInput: Dispatch<SetStateAction<string>>;
	setInspectorTab: Dispatch<SetStateAction<InspectorTab>>;
	setLeftOpen: Dispatch<SetStateAction<boolean>>;
	setRightOpen: Dispatch<SetStateAction<boolean>>;
}
