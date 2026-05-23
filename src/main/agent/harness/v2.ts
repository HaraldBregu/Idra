import { agentLogger } from '../logger';
import type { AgentHarnessAttemptParams, AgentHarnessAttemptResult, AgentHarness } from './types';

type AgentHarnessV2LifecyclePhase =
	| 'prepare'
	| 'start'
	| 'send'
	| 'resolve'
	| 'cleanup';

type AgentHarnessV2PreparedRun = {
	harnessId: string;
	label: string;
	pluginId?: string;
	params: AgentHarnessAttemptParams;
	lifecycleState: 'prepared';
};

type AgentHarnessV2Session = {
	harnessId: string;
	label: string;
	pluginId?: string;
	params: AgentHarnessAttemptParams;
	lifecycleState: 'started';
};

type AgentHarnessV2 = {
	id: string;
	label: string;
	pluginId?: string;
	supports: AgentHarness['supports'];
	prepare: (params: AgentHarnessAttemptParams) => Promise<AgentHarnessV2PreparedRun>;
	start: (prepared: AgentHarnessV2PreparedRun) => Promise<AgentHarnessV2Session>;
	send: (session: AgentHarnessV2Session) => Promise<AgentHarnessAttemptResult>;
	resolveOutcome: (
		session: AgentHarnessV2Session,
		result: AgentHarnessAttemptResult
	) => Promise<AgentHarnessAttemptResult>;
	cleanup: (params: {
		prepared?: AgentHarnessV2PreparedRun;
		session?: AgentHarnessV2Session;
		result?: AgentHarnessAttemptResult;
		error?: unknown;
	}) => Promise<void>;
};

type AgentHarnessV2RunBase = {
	harnessId: string;
	label: string;
	pluginId?: string;
	params: AgentHarnessAttemptParams;
};

export function adaptAgentHarnessToV2(harness: AgentHarness): AgentHarnessV2 {
	return {
		id: harness.id,
		label: harness.label,
		pluginId: harness.pluginId,
		supports: (ctx) => harness.supports(ctx),
		prepare: async (params) => ({
			...toV2RunBase(harness, params),
			lifecycleState: 'prepared',
		}),
		start: async (prepared) => ({
			...toV2RunBase(harness, prepared.params),
			lifecycleState: 'started',
		}),
		send: async (session) => harness.runAttempt(session.params),
		resolveOutcome: async (_session, result) => result,
		cleanup: async () => {
			// V1 harnesses do not have per-attempt cleanup by default.
		},
	};
}

export async function runAgentHarnessV2LifecycleAttempt(
	harness: AgentHarnessV2,
	params: AgentHarnessAttemptParams
): Promise<AgentHarnessAttemptResult> {
	let prepared: AgentHarnessV2PreparedRun | undefined;
	let session: AgentHarnessV2Session | undefined;
	let rawResult: AgentHarnessAttemptResult | undefined;
	let result: AgentHarnessAttemptResult;
	let phase: AgentHarnessV2LifecyclePhase = 'prepare';

	try {
		phase = 'prepare';
		prepared = await harness.prepare(params);
		phase = 'start';
		session = await harness.start(prepared);
		phase = 'send';
		rawResult = await harness.send(session);
		phase = 'resolve';
		result = await harness.resolveOutcome(session, rawResult);
	} catch (error) {
		await runHarnessCleanup({ harness, params, prepared, session, rawResult, error, phase });
		throw error;
	}

	await runHarnessCleanup({ harness, params, prepared, session, result, phase: 'cleanup' });
	return result;
}

async function runHarnessCleanup(params: {
	harness: AgentHarnessV2;
	params: AgentHarnessAttemptParams;
	prepared?: AgentHarnessV2PreparedRun;
	session?: AgentHarnessV2Session;
	result?: AgentHarnessAttemptResult;
	error?: unknown;
	phase?: AgentHarnessV2LifecyclePhase;
}): Promise<void> {
	const { harness, params: attemptParams, prepared, session, result, error, phase } = params;
	try {
		await harness.cleanup({
			prepared,
			session,
			result,
			error,
		});
		return;
	} catch (cleanupError) {
		agentLogger.warn(
			'agents/harness/v2',
			`agent harness cleanup failed in phase ${phase ?? 'unknown'}`,
			{
				harnessId: attemptParams.provider,
				provider: attemptParams.provider,
				model: attemptParams.model,
				error: String(cleanupError),
				originalError: error ? String(error) : undefined,
			}
		);
		throw cleanupError;
	}
}

function toV2RunBase(harness: AgentHarness, params: AgentHarnessAttemptParams): AgentHarnessV2RunBase {
	return {
		harnessId: harness.id,
		label: harness.label,
		pluginId: harness.pluginId,
		params,
	};
}
