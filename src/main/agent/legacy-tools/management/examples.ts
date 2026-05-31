import { createToolResult, type Tool, type ToolExample } from './types';

interface CalculationInput {
	operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'percent';
	operands: number[];
}

interface CalculationOutput {
	result: number;
	expression: string;
}

export const CalculatorTool: Tool<CalculationInput, CalculationOutput> = {
	...baseTool('calculator', 'Calculator', 'Reliable arithmetic for explicit numeric inputs.', 'calculator'),
	inputSchema: {
		type: 'object',
		properties: {
			operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide', 'percent'] },
			operands: { type: 'array', items: { type: 'number' } },
		},
		required: ['operation', 'operands'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: { result: { type: 'number' }, expression: { type: 'string' } },
		required: ['result', 'expression'],
		additionalProperties: false,
	},
	examples: [{ description: 'Add two numbers', input: { operation: 'add', operands: [2, 3] }, output: { result: 5, expression: '2 + 3' } }],
	async execute(input) {
		const startedAt = new Date();
		const [first = 0, ...rest] = input.operands;
		const result = rest.reduce((acc, value) => {
			if (input.operation === 'add') return acc + value;
			if (input.operation === 'subtract') return acc - value;
			if (input.operation === 'multiply') return acc * value;
			if (input.operation === 'divide') return value === 0 ? Number.NaN : acc / value;
			return (acc * value) / 100;
		}, first);
		return createToolResult({
			toolId: 'calculator',
			success: Number.isFinite(result),
			data: { result, expression: `${input.operation}(${input.operands.join(', ')})` },
			error: Number.isFinite(result)
				? undefined
				: { code: 'CALCULATION_INVALID', message: 'calculation produced a non-finite result', retryable: false, category: 'validation' },
			startedAt,
			finishedAt: new Date(),
		});
	},
};

export const WeatherTool: Tool<{ location: string; date?: string }, { location: string; forecast: string; asOf: string }> = {
	...baseTool<{ location: string; date?: string }, { location: string; forecast: string; asOf: string }>(
		'weather',
		'Weather',
		'Mock weather lookup for forecast-style requests.',
		'web',
		['weather', 'forecast']
	),
	permissionsRequired: ['web:read'],
	inputSchema: {
		type: 'object',
		properties: { location: { type: 'string' }, date: { type: 'string' } },
		required: ['location'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: { location: { type: 'string' }, forecast: { type: 'string' }, asOf: { type: 'string' } },
		required: ['location', 'forecast', 'asOf'],
		additionalProperties: false,
	},
	async execute(input, context) {
		const startedAt = new Date();
		return createToolResult({
			toolId: 'weather',
			success: true,
			data: { location: input.location, forecast: 'Partly cloudy, 21 C', asOf: context.now.toISOString() },
			startedAt,
			finishedAt: new Date(),
			metadata: { source: 'mock-weather', fetchedAt: context.now.toISOString() },
		});
	},
};

export const WebSearchTool: Tool<{ query: string }, { results: Array<{ title: string; url: string; snippet: string }> }> = {
	...baseTool<{ query: string }, { results: Array<{ title: string; url: string; snippet: string }> }>(
		'web-search',
		'Web Search',
		'Mock web search for current public information.',
		'search',
		['search', 'web', 'current']
	),
	permissionsRequired: ['web:read'],
	inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
	outputSchema: { type: 'object', properties: { results: { type: 'array' } }, required: ['results'], additionalProperties: false },
	async execute(input, context) {
		const startedAt = new Date();
		return createToolResult({
			toolId: 'web-search',
			success: true,
			data: { results: [{ title: `Result for ${input.query}`, url: 'https://example.com', snippet: 'Mock public result.' }] },
			startedAt,
			finishedAt: new Date(),
			metadata: { source: 'mock-search', fetchedAt: context.now.toISOString(), citations: ['https://example.com'] },
		});
	},
};

export const EmailDraftTool: Tool<{ to: string; subject: string; body: string }, { draftId: string; to: string; subject: string }> = {
	...baseTool<{ to: string; subject: string; body: string }, { draftId: string; to: string; subject: string }>(
		'email-draft',
		'Email Draft',
		'Create an email draft without sending it.',
		'email',
		['email', 'draft']
	),
	permissionsRequired: ['email:draft'],
	safetyLevel: 'medium',
	metadata: { ...baseTool('email-draft', 'Email Draft', '', 'email').metadata, privacyLevel: 'private', readOnly: false },
	inputSchema: {
		type: 'object',
		properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } },
		required: ['to', 'subject', 'body'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: { draftId: { type: 'string' }, to: { type: 'string' }, subject: { type: 'string' } },
		required: ['draftId', 'to', 'subject'],
		additionalProperties: false,
	},
	async execute(input) {
		const startedAt = new Date();
		return createToolResult({
			toolId: 'email-draft',
			success: true,
			data: { draftId: `draft-${Date.now()}`, to: input.to, subject: input.subject },
			startedAt,
			finishedAt: new Date(),
		});
	},
};

export const CalendarCreateEventTool: Tool<
	{ title: string; startsAt: string; endsAt: string; attendees?: string[] },
	{ eventId: string; title: string; startsAt: string; endsAt: string }
> = {
	...baseTool<
		{ title: string; startsAt: string; endsAt: string; attendees?: string[] },
		{ eventId: string; title: string; startsAt: string; endsAt: string }
	>('calendar-create-event', 'Calendar Create Event', 'Create a calendar event after confirmation.', 'calendar', [
		'calendar',
		'event',
		'schedule',
	]),
	permissionsRequired: ['calendar:write'],
	safetyLevel: 'high',
	metadata: {
		...baseTool('calendar-create-event', 'Calendar Create Event', '', 'calendar').metadata,
		privacyLevel: 'private',
		readOnly: false,
		requiresConfirmation: true,
	},
	inputSchema: {
		type: 'object',
		properties: {
			title: { type: 'string' },
			startsAt: { type: 'string' },
			endsAt: { type: 'string' },
			attendees: { type: 'array', items: { type: 'string' } },
		},
		required: ['title', 'startsAt', 'endsAt'],
		additionalProperties: false,
	},
	outputSchema: {
		type: 'object',
		properties: { eventId: { type: 'string' }, title: { type: 'string' }, startsAt: { type: 'string' }, endsAt: { type: 'string' } },
		required: ['eventId', 'title', 'startsAt', 'endsAt'],
		additionalProperties: false,
	},
	async execute(input) {
		const startedAt = new Date();
		return createToolResult({
			toolId: 'calendar-create-event',
			success: true,
			data: { eventId: `event-${Date.now()}`, title: input.title, startsAt: input.startsAt, endsAt: input.endsAt },
			startedAt,
			finishedAt: new Date(),
		});
	},
};

export const FileSearchTool: Tool<{ query: string }, { matches: string[] }> = {
	...baseTool<{ query: string }, { matches: string[] }>('file-search', 'File Search', 'Search indexed workspace file names.', 'files', [
		'files',
		'workspace',
		'search',
	]),
	permissionsRequired: ['workspace:read'],
	metadata: { ...baseTool('file-search', 'File Search', '', 'files').metadata, privacyLevel: 'private', readOnly: true },
	inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
	outputSchema: { type: 'object', properties: { matches: { type: 'array' } }, required: ['matches'], additionalProperties: false },
	async execute(input, context) {
		const startedAt = new Date();
		const files = Array.isArray(context.metadata?.files) ? context.metadata.files.filter((item): item is string => typeof item === 'string') : [];
		return createToolResult({
			toolId: 'file-search',
			success: true,
			data: { matches: files.filter((file) => file.toLowerCase().includes(input.query.toLowerCase())) },
			startedAt,
			finishedAt: new Date(),
		});
	},
};

export const MemorySearchTool: Tool<{ query: string }, { memories: string[] }> = {
	...baseTool<{ query: string }, { memories: string[] }>(
		'memory-search',
		'Memory Search',
		'Search approved non-sensitive user memory.',
		'memory',
		['memory', 'preferences']
	),
	permissionsRequired: ['memory:read'],
	inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
	outputSchema: { type: 'object', properties: { memories: { type: 'array' } }, required: ['memories'], additionalProperties: false },
	async execute(input, context) {
		const startedAt = new Date();
		const memories = Array.isArray(context.metadata?.memories) ? context.metadata.memories.filter((item): item is string => typeof item === 'string') : [];
		return createToolResult({
			toolId: 'memory-search',
			success: true,
			data: { memories: memories.filter((memory) => memory.toLowerCase().includes(input.query.toLowerCase())) },
			startedAt,
			finishedAt: new Date(),
		});
	},
};

export function createExampleTools(): Tool[] {
	return [CalculatorTool, WeatherTool, WebSearchTool, EmailDraftTool, CalendarCreateEventTool, FileSearchTool, MemorySearchTool];
}

function baseTool<TInput, TOutput>(
	id: string,
	name: string,
	description: string,
	category: Tool['category'],
	tags: string[] = []
): Omit<Tool<TInput, TOutput>, 'inputSchema' | 'outputSchema' | 'execute'> {
	return {
		id,
		name,
		description,
		category,
		permissionsRequired: [],
		safetyLevel: 'low',
		costEstimate: { amount: 0, currency: 'none', unit: 'call', tier: 'free' },
		latencyEstimate: { p50Ms: 20, p95Ms: 100 },
		reliabilityScore: 0.9,
		rateLimit: { maxCalls: 60, windowMs: 60_000, scope: 'session' },
		examples: [] as Array<ToolExample<TInput, TOutput>>,
		tags,
		enabled: true,
		version: '1.0.0',
		owner: 'friday',
		metadata: {
			whenToUse: description,
			whenNotToUse: 'Do not use when the user already provided enough information to answer.',
			privacyLevel: 'public',
			readOnly: true,
			cacheable: true,
		},
	};
}
