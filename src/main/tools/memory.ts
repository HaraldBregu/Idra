import {
	WorkspaceMemorySearchManager,
	type MemoryCorpus,
	type MemorySearchManager,
	type MemorySource,
} from '../memory-runtime';
import type { AgentTool, AgentToolResult, ToolContext } from './types';

interface MemoryToolOptions {
	enabled?: boolean;
	managerFactory?: (ctx: ToolContext) => MemorySearchManager;
}

interface MemorySearchArgs {
	query: string;
	maxResults?: number;
	minScore?: number;
	corpus?: MemoryCorpus;
}

interface MemoryGetArgs {
	path: string;
	from?: number;
	lines?: number;
	maxChars?: number;
	corpus?: Exclude<MemoryCorpus, 'sessions'>;
}

function jsonToolResult<T>(payload: T, isError = false): AgentToolResult<T> {
	return {
		status: isError ? 'error' : 'ok',
		content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
		details: payload,
	};
}

function unavailable(reason: string): AgentToolResult {
	return jsonToolResult({
		status: 'unavailable',
		reason,
		results: [],
	});
}

function managerForContext(ctx: ToolContext, options: MemoryToolOptions): MemorySearchManager {
	if (options.managerFactory) return options.managerFactory(ctx);
	return new WorkspaceMemorySearchManager({
		workspaceDir: ctx.workspace,
		sessionBaseDir: ctx.sessionBaseDir,
		currentSessionId: ctx.sessionId,
		sessionVisibility: ctx.sessionVisibility,
		enabled: options.enabled,
	});
}

function sourcesForCorpus(corpus: MemoryCorpus | undefined): MemorySource[] | undefined {
	if (corpus === 'memory') return ['memory'];
	if (corpus === 'sessions') return ['sessions'];
	if (corpus === 'all' || corpus === undefined) return ['memory', 'sessions'];
	return undefined;
}

export function createMemorySearchTool(options: MemoryToolOptions = {}): AgentTool<MemorySearchArgs> {
	return {
		name: 'memory_search',
		description:
			'Search durable workspace memory and visible session transcripts. Use before answering questions about prior work, preferences, TODOs, or project history.',
		schema: {
			type: 'object',
			properties: {
				query: { type: 'string' },
				maxResults: { type: 'number' },
				minScore: { type: 'number' },
				corpus: { type: 'string', enum: ['memory', 'wiki', 'all', 'sessions'] },
			},
			required: ['query'],
			additionalProperties: false,
		},
		async execute(args, ctx) {
			if (options.enabled === false) return unavailable('memory search is disabled');
			if (args.corpus === 'wiki') return unavailable('wiki corpus is not configured in this runtime');
			const query = String(args.query ?? '').trim();
			if (!query) return jsonToolResult({ status: 'ok', results: [], debug: { reason: 'empty_query' } });
			const manager = managerForContext(ctx, options);
			const results = await manager.search(query, {
				maxResults: args.maxResults,
				minScore: args.minScore,
				sources: sourcesForCorpus(args.corpus),
			});
			return jsonToolResult({
				status: 'ok',
				results,
				debug: {
					provider: 'builtin-keyword',
					fallback: false,
					corpus: args.corpus ?? 'all',
				},
			});
		},
	};
}

export function createMemoryGetTool(options: MemoryToolOptions = {}): AgentTool<MemoryGetArgs> {
	return {
		name: 'memory_get',
		description:
			'Read a bounded range from MEMORY.md, memory/*.md, or configured memory Markdown paths after memory_search finds a useful hit.',
		schema: {
			type: 'object',
			properties: {
				path: { type: 'string' },
				from: { type: 'number' },
				lines: { type: 'number' },
				maxChars: { type: 'number' },
				corpus: { type: 'string', enum: ['memory', 'wiki', 'all'] },
			},
			required: ['path'],
			additionalProperties: false,
		},
		async execute(args, ctx) {
			if (options.enabled === false) return unavailable('memory search is disabled');
			if (args.corpus === 'wiki') return unavailable('wiki corpus is not configured in this runtime');
			const manager = managerForContext(ctx, options);
			try {
				const result = await manager.readFile(args.path, {
					from: args.from,
					lines: args.lines,
					maxChars: args.maxChars,
				});
				const trailer = result.truncated && result.nextFrom ? `\n\n[nextFrom: ${result.nextFrom}]` : '';
				return {
					status: 'ok',
					content: [{ type: 'text', text: `# ${result.path}\n${result.text}${trailer}` }],
					details: result,
				};
			} catch (error) {
				return jsonToolResult(
					{
						status: 'error',
						message: error instanceof Error ? error.message : String(error),
					},
					true
				);
			}
		},
	};
}

export const memorySearchTool = createMemorySearchTool();
export const memoryGetTool = createMemoryGetTool();
