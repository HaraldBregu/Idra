import type { AgentTool, AgentToolResult, AgentToolUpdate, ToolDiagnostics } from '../core/common';
import type { PolicyServicePort } from '../../policy';
import {
	copyToolMetadata,
	getToolMetadata,
	sanitizeParamPreview,
	setToolMetadata,
	ToolInputError,
} from '../core/common';
import { blockedToolResult, errorToolResult } from '../core/results';
import {
	evaluateToolApprovalPolicy,
	evaluateToolHookPolicy,
	evaluateToolUsePolicy,
	toolUsePolicyKey,
} from '../../policy';

export type ToolApprovalDecision = 'allow-once' | 'allow-always' | 'deny' | boolean | null;
export type ToolApprovalResolution = 'allow-once' | 'allow-always' | 'deny' | 'timeout' | 'cancelled';

export type RequiredToolApproval = {
	title: string;
	description: string;
	severity?: 'info' | 'warning' | 'critical';
	timeoutMs?: number;
	timeoutBehavior?: 'allow' | 'deny';
	pluginId?: string;
	allowedDecisions?: ApprovalDecisionTuple;
	onResolution?: (resolution: ToolApprovalResolution) => void | Promise<void>;
};

type ApprovalDecisionTuple = ['allow-once', 'allow-always', 'deny'] | ['allow-once', 'deny'] | ['deny'];

export type BeforeToolCallHookResult =
	| void
	| {
			allow?: boolean;
			reason?: string;
			deniedReason?: string;
			params?: unknown;
			block?: boolean;
			blockReason?: string;
			requireApproval?: RequiredToolApproval;
	  };

export type BeforeToolCallHook = (input: {
	tool: AgentTool;
	toolCallId: string;
	params: unknown;
}) => Promise<BeforeToolCallHookResult> | BeforeToolCallHookResult;

export type BeforeToolCallContext = {
	runId?: string;
	diagnostics?: ToolDiagnostics;
	approval?: (request: {
		toolName: string;
		toolCallId: string;
		runId?: string;
		paramsPreview: unknown;
		derivedPaths?: string[];
		approval?: Omit<RequiredToolApproval, 'onResolution'>;
	}) => Promise<ToolApprovalDecision>;
	beforeToolCallHooks?: BeforeToolCallHook[];
	loopDetector?: CallTracker;
	loopWarnAt?: number;
	loopStopAt?: number;
	policy?: Pick<PolicyServicePort, 'evaluateToolUse' | 'evaluateToolHook' | 'evaluateToolApproval'>;
	signal?: AbortSignal;
};

export type CallTracker = {
	counts: Map<string, number>;
};

export function newCallTracker(): CallTracker {
	return { counts: new Map() };
}

const DEFAULT_LOOP_WARN_AT = 3;
const DEFAULT_LOOP_STOP_AT = 5;

export function wrapToolWithBeforeToolCall(
	tool: AgentTool,
	context: BeforeToolCallContext = {}
): AgentTool {
	const tracker = context.loopDetector ?? newCallTracker();
	const wrapped: AgentTool = {
		...tool,
		async execute(toolCallId, rawParams, signal, onUpdate) {
			const startedAt = Date.now();
			const diagnostics = context.diagnostics;
			const effectiveSignal = signal ?? context.signal;
			let params = tool.prepareArguments ? tool.prepareArguments(rawParams) : rawParams;
			const key = toolUsePolicyKey(tool.name, params);
			const count = (tracker.counts.get(key) ?? 0) + 1;
			tracker.counts.set(key, count);

			const policyDecision = (context.policy?.evaluateToolUse ?? evaluateToolUsePolicy)({
				toolName: tool.name,
				params,
				callCount: count,
				loopWarnAt: context.loopWarnAt ?? DEFAULT_LOOP_WARN_AT,
				loopStopAt: context.loopStopAt ?? DEFAULT_LOOP_STOP_AT,
			});

			if (policyDecision.outcome === 'deny') {
				const result = blockedToolResult({
					reason: policyDecision.reason,
					deniedReason: policyDecision.deniedReason,
				});
				diagnostics?.emit({
					type: 'tool.execution.blocked',
					message: result.content[0]?.type === 'text' ? result.content[0].text : undefined,
					details: { toolName: tool.name, toolCallId, reason: policyDecision.deniedReason },
				});
				return result;
			}

			for (const hook of context.beforeToolCallHooks ?? []) {
				const decision = await hook({ tool, toolCallId, params });
				if (!decision) continue;
				if (decision.params !== undefined) params = decision.params;
				const hookPolicy = (context.policy?.evaluateToolHook ?? evaluateToolHookPolicy)({
					toolName: tool.name,
					allow: decision.allow,
					block: decision.block,
					reason: decision.reason,
					blockReason: decision.blockReason,
					deniedReason: decision.deniedReason,
				});
				if (hookPolicy.outcome === 'deny') {
					return blockedToolResult({
						reason: hookPolicy.reason,
						deniedReason: hookPolicy.deniedReason,
					});
				}
				if (decision.requireApproval) {
					const approval = context.approval
						? await context.approval({
								toolName: tool.name,
								toolCallId,
								runId: context.runId,
								paramsPreview: sanitizeParamPreview(params),
								approval: {
									title: decision.requireApproval.title,
									description: decision.requireApproval.description,
									severity: decision.requireApproval.severity,
									timeoutMs: decision.requireApproval.timeoutMs,
									timeoutBehavior: decision.requireApproval.timeoutBehavior,
									pluginId: decision.requireApproval.pluginId,
									allowedDecisions: decision.requireApproval.allowedDecisions,
								},
							})
						: undefined;
					const approvalPolicy = (context.policy?.evaluateToolApproval ?? evaluateToolApprovalPolicy)({
						toolName: tool.name,
						approvalAvailable: Boolean(context.approval),
						approvalDecision: approval,
						requiredReason: decision.requireApproval.description,
						deniedReason: decision.requireApproval.description,
					});
					if (approvalPolicy.outcome === 'deny') {
						await decision.requireApproval.onResolution?.(approvalPolicy.resolution);
						return blockedToolResult({
							reason: approvalPolicy.reason,
							deniedReason: approvalPolicy.deniedReason,
						});
					}
					await decision.requireApproval.onResolution?.(approvalPolicy.resolution);
				}
			}

			if (policyDecision.warning) {
				onUpdate?.({
					type: 'tool.execution.loop_warning',
					message: policyDecision.warning,
				});
			}

			diagnostics?.emit({
				type: 'tool.execution.started',
				details: { toolName: tool.name, toolCallId, params: sanitizeParamPreview(params) },
			});

			try {
				const forwardUpdate = (update: AgentToolUpdate): void => {
					diagnostics?.emit({ type: update.type, message: update.message, details: update.details });
					onUpdate?.(update);
				};
				const result = await tool.execute(toolCallId, params, effectiveSignal, forwardUpdate);
				diagnostics?.emit({
					type: 'tool.execution.completed',
					details: {
						toolName: tool.name,
						toolCallId,
						durationMs: Date.now() - startedAt,
						contentBlocks: Array.isArray(result.content) ? result.content.length : 0,
					},
				});
				return result;
			} catch (error) {
				const result =
					error instanceof ToolInputError
						? ({
								content: [{ type: 'text', text: error.message }],
								details: { status: 'input_error', message: error.message, details: error.details },
							} satisfies AgentToolResult)
						: errorToolResult({ toolName: tool.name, error });
				diagnostics?.emit({
					type: 'tool.execution.error',
					message: result.content[0]?.type === 'text' ? result.content[0].text : undefined,
					details: { toolName: tool.name, toolCallId, durationMs: Date.now() - startedAt },
				});
				return result;
			}
		},
	};
	copyToolMetadata(tool, wrapped);
	const metadata = getToolMetadata(wrapped);
	if (metadata) setToolMetadata(wrapped, { ...metadata, wrapped: true });
	return wrapped;
}
