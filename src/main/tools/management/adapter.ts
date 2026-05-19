import type { AgentTool, AgentToolResult, ToolContext } from '../types';
import { textResult } from '../types';
import { createToolResult, type Tool, type ToolCategory, type ToolExecutionContext } from './types';
import { createToolRegistry, type ToolRegistry } from './registry';
import { TOOL_LIMITS } from '../limits';

export interface AgentToolAdapterOptions {
	idPrefix?: string;
	owner?: string;
	version?: string;
	permissionsRequired?: string[];
	category?: ToolCategory;
	tags?: string[];
}

export function agentToolToManagedTool(
	agentTool: AgentTool,
	options: AgentToolAdapterOptions = {}
): Tool<Record<string, unknown>, AgentToolResult> {
	const id = `${options.idPrefix ?? ''}${agentTool.name}`;
	const category = options.category ?? inferCategory(agentTool.name, agentTool.description);
	return {
		id,
		name: agentTool.name,
		description: agentTool.description,
		category,
		inputSchema: agentTool.schema,
		outputSchema: {
			type: 'object',
			properties: {
				status: { type: 'string', enum: ['ok', 'error'] },
				content: { type: 'array' },
				details: {},
			},
			required: ['status', 'content'],
			additionalProperties: true,
		},
		permissionsRequired:
			options.permissionsRequired ?? inferPermissions(agentTool.name, agentTool.description),
		safetyLevel: inferSafety(agentTool.name, agentTool.description),
		costEstimate: { amount: 0, currency: 'none', unit: 'call', tier: 'free' },
		latencyEstimate: inferLatency(agentTool.name),
		reliabilityScore: inferReliability(agentTool.name),
		rateLimit: inferRateLimit(agentTool.name),
		examples: [{ description: `Example ${agentTool.name} call`, input: {} }],
		tags: options.tags ?? inferTags(agentTool.name, category),
		enabled: true,
		version: options.version ?? '1.0.0',
		owner: options.owner ?? 'friday',
		metadata: {
			whenToUse: agentTool.description,
			whenNotToUse:
				'Do not use if the user request can be answered directly without this capability.',
			privacyLevel: inferPrivacy(agentTool.name, agentTool.description),
			readOnly: isReadOnly(agentTool.name),
			executionTimeoutMs: inferExecutionTimeout(agentTool.name),
			requiresConfirmation: false,
			cacheable: isReadOnly(agentTool.name),
			safetyNotes: agentTool.needsApproval
				? 'Legacy approval gate applies before execution.'
				: undefined,
		},
		async execute(input: Record<string, unknown>, context: ToolExecutionContext) {
			const startedAt = new Date();
			try {
				const legacyContext = context.metadata?.legacyToolContext;
				if (!isToolContext(legacyContext)) {
					return createToolResult({
						toolId: id,
						success: false,
						error: {
							code: 'LEGACY_CONTEXT_MISSING',
							message: 'legacy tool context is required',
							retryable: false,
							category: 'validation',
						},
						startedAt,
						finishedAt: new Date(),
					});
				}
				const data = await agentTool.execute(input, {
					...legacyContext,
					signal: context.signal,
				});
				return createToolResult({
					toolId: id,
					success: data.status === 'ok',
					data,
					error:
						data.status === 'error'
							? {
									code: 'AGENT_TOOL_ERROR',
									message: data.content
										.map((block) => (block.type === 'text' ? (block.text ?? '') : ''))
										.join('\n'),
									retryable: false,
									category: 'provider',
								}
							: undefined,
					warnings: [],
					startedAt,
					finishedAt: new Date(),
				});
			} catch (error) {
				return createToolResult({
					toolId: id,
					success: false,
					error: {
						code: 'AGENT_TOOL_THROW',
						message: error instanceof Error ? error.message : 'tool failed',
						retryable: false,
						category: 'unknown',
					},
					data: textResult(`tool ${agentTool.name} failed`, true),
					startedAt,
					finishedAt: new Date(),
				});
			}
		},
	};
}

export function createAgentToolRegistry(agentTools: AgentTool[]): ToolRegistry {
	return createToolRegistry(agentTools.map((tool) => agentToolToManagedTool(tool)));
}

function inferCategory(name: string, description = ''): ToolCategory {
	const text = `${name} ${description}`.toLowerCase();
	if (/\b(gmail|email|mail|inbox)\b/.test(text)) return 'email';
	if (/\b(google calendar|calendar|event|meeting|appointment)\b/.test(text)) return 'calendar';
	if (/\b(google drive|drive file|drive files|drive document|drive documents)\b/.test(text)) return 'files';
	if (
		[
			'read',
			'write',
			'edit',
			'apply_patch',
			'delete',
			'copy',
			'move',
			'inspect_file',
			'find',
			'get_workspace_content',
			'get_workspace_path',
			'startup_files',
		].includes(name)
	)
		return 'files';
	if (['exec', 'process'].includes(name)) return 'codeExecution';
	if (name.includes('web') || name === 'browser') return 'web';
	if (name.includes('cron')) return 'calendar';
	if (
		name.includes('provider') ||
		name.includes('agent') ||
		name.includes('app') ||
		name.includes('theme') ||
		name.includes('menu')
	)
		return 'internalApi';
	return 'utility';
}

function inferPermissions(name: string, description = ''): string[] {
	const text = `${name} ${description}`.toLowerCase();
	if (/\b(gmail|email|mail|inbox)\b/.test(text)) {
		return /\b(send|draft|create|trash|delete|modify)\b/.test(text)
			? ['email:write']
			: ['email:read'];
	}
	if (/\b(google calendar|calendar|event|meeting|appointment)\b/.test(text)) {
		return /\b(create|update|delete|write)\b/.test(text) ? ['calendar:write'] : ['calendar:read'];
	}
	if (/\b(google drive|drive file|drive files|drive document|drive documents)\b/.test(text)) {
		return /\b(create|upload|write)\b/.test(text) ? ['drive:write'] : ['drive:read'];
	}
	if (
		['read', 'find', 'inspect_file', 'get_workspace_content', 'get_workspace_path'].includes(name)
	)
		return ['workspace:read'];
	if (name === 'startup_files') return ['agent:startup'];
	if (['write', 'edit', 'apply_patch', 'delete', 'copy', 'move'].includes(name))
		return ['workspace:write'];
	if (['exec', 'process'].includes(name)) return ['code:execute'];
	if (name.includes('web')) return ['web:read'];
	if (name === 'cron') return ['calendar:read', 'calendar:write'];
	if (name.includes('cron_add') || name.includes('cron_remove')) return ['calendar:write'];
	if (name.includes('cron_list')) return ['calendar:read'];
	if (name.startsWith('set_') || name.startsWith('open_')) return ['app:write'];
	return [];
}

function inferSafety(
	name: string,
	description = ''
): Tool<Record<string, unknown>, AgentToolResult>['safetyLevel'] {
	const text = `${name} ${description}`.toLowerCase();
	if (
		/\b(send|trash|delete|create|update|modify)\b/.test(text) &&
		/\b(gmail|email|mail|calendar|event|google drive|drive file|drive document)\b/.test(text)
	)
		return 'high';
	if (
		[
			'write',
			'edit',
			'apply_patch',
			'delete',
			'move',
			'exec',
			'cron',
			'cron_add',
			'cron_remove',
			'startup_files',
		].includes(name)
	)
		return 'high';
	if (name === 'copy' || name === 'inspect_file') return 'medium';
	if (['web_fetch', 'open_accessibility', 'open_screen_recording'].includes(name)) return 'medium';
	return 'low';
}

function inferLatency(
	name: string
): Tool<Record<string, unknown>, AgentToolResult>['latencyEstimate'] {
	if (name === 'exec') return { p50Ms: 1_000, p95Ms: TOOL_LIMITS.exec.timeoutMs };
	if (name.includes('web')) return { p50Ms: 800, p95Ms: 5_000 };
	return { p50Ms: 50, p95Ms: 500 };
}

function inferReliability(name: string): number {
	if (
		[
			'read',
			'write',
			'edit',
			'apply_patch',
			'delete',
			'copy',
			'move',
			'inspect_file',
			'find',
			'update_plan',
		].includes(name)
	)
		return 0.95;
	if (['web_fetch', 'exec'].includes(name)) return 0.78;
	return 0.88;
}

function inferRateLimit(name: string): Tool<Record<string, unknown>, AgentToolResult>['rateLimit'] {
	if (name === 'web_fetch')
		return {
			maxCalls: TOOL_LIMITS.webFetch.rateLimitCalls,
			windowMs: TOOL_LIMITS.webFetch.rateLimitWindowMs,
			scope: 'session',
		};
	if (name === 'exec')
		return {
			maxCalls: TOOL_LIMITS.exec.rateLimitCalls,
			windowMs: TOOL_LIMITS.exec.rateLimitWindowMs,
			scope: 'session',
		};
	return undefined;
}

function inferExecutionTimeout(name: string): number | undefined {
	if (name === 'exec') return TOOL_LIMITS.exec.timeoutMs;
	return undefined;
}

function inferTags(name: string, category: ToolCategory): string[] {
	return [category, ...name.split('_')].filter(Boolean);
}

function inferPrivacy(
	name: string,
	description = ''
): Tool<Record<string, unknown>, AgentToolResult>['metadata']['privacyLevel'] {
	const text = `${name} ${description}`.toLowerCase();
	if (/\b(gmail|email|mail|inbox|google calendar|calendar|event|meeting|appointment|google drive|drive file|drive document)\b/.test(text))
		return 'private';
	if (
		[
			'read',
			'write',
			'edit',
			'apply_patch',
			'delete',
			'copy',
			'move',
			'inspect_file',
			'find',
			'exec',
			'process',
		].includes(name)
	)
		return 'private';
	if (name.includes('provider') || name.includes('agent')) return 'sensitive';
	return 'internal';
}

function isReadOnly(name: string): boolean {
	if (
		/(^|_)search_files$/.test(name) ||
		/(^|_)list_recent_files$/.test(name) ||
		/(^|_)read_file_content$/.test(name) ||
		/(^|_)get_file_metadata$/.test(name) ||
		/(^|_)get_file_permissions$/.test(name) ||
		/(^|_)download_file_content$/.test(name) ||
		/(^|_)list_drives$/.test(name)
	) {
		return true;
	}
	return [
		'read',
		'find',
		'inspect_file',
		'web_fetch',
		'get_workspace_content',
		'get_workspace_path',
		'cron_list',
		'process',
	].includes(name);
}

function isToolContext(value: unknown): value is ToolContext {
	return (
		typeof value === 'object' &&
		value !== null &&
		'workspace' in value &&
		'sessionId' in value &&
		'services' in value
	);
}
