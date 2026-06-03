import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';

type ToolDefinition = Omit<AgentTool, 'execute'>;

const objectSchema = (properties: Record<string, unknown> = {}, required: string[] = []) => ({
	type: 'object',
	properties,
	required,
	additionalProperties: false,
});

const stringArraySchema = { type: 'array', items: { type: 'string' } };

const searchRequestSchema = {
	type: 'array',
	items: objectSchema({
		q: { type: 'string' },
		recency: { type: 'number' },
		domains: stringArraySchema,
	}, ['q']),
};

const pageRefSchema = {
	type: 'array',
	items: objectSchema({
		ref_id: { type: 'string' },
		lineno: { type: 'number' },
	}, ['ref_id']),
};

const agentInputItemSchema = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: ['text', 'image', 'local_image', 'skill', 'mention'] },
		text: { type: 'string' },
		path: { type: 'string' },
		name: { type: 'string' },
		image_url: { type: 'string' },
	},
	additionalProperties: false,
};

const hostProvidedTool = async () =>
	textResult('This tool is host-provided and is not executable by Friday locally.', true);

const toolDefinitions = [
	{
		name: 'web.run',
		description:
			'Accesses the internet for search, page reading, link navigation, page text lookup, PDF screenshots, image search, finance, weather, sports, and time queries.',
		schema: objectSchema({
			search_query: searchRequestSchema,
			image_query: searchRequestSchema,
			open: pageRefSchema,
			click: {
				type: 'array',
				items: objectSchema({
					ref_id: { type: 'string' },
					id: { type: 'number' },
				}, ['ref_id', 'id']),
			},
			find: {
				type: 'array',
				items: objectSchema({
					ref_id: { type: 'string' },
					pattern: { type: 'string' },
				}, ['ref_id', 'pattern']),
			},
			screenshot: {
				type: 'array',
				items: objectSchema({
					ref_id: { type: 'string' },
					pageno: { type: 'number' },
				}, ['ref_id', 'pageno']),
			},
			finance: {
				type: 'array',
				items: objectSchema({
					ticker: { type: 'string' },
					type: { type: 'string', enum: ['equity', 'fund', 'crypto', 'index'] },
					market: { type: 'string' },
				}, ['ticker', 'type']),
			},
			weather: {
				type: 'array',
				items: objectSchema({
					location: { type: 'string' },
					start: { type: 'string' },
					duration: { type: 'number' },
				}, ['location']),
			},
			sports: {
				type: 'array',
				items: objectSchema({
					tool: { type: 'string', enum: ['sports'] },
					fn: { type: 'string', enum: ['schedule', 'standings'] },
					league: {
						type: 'string',
						enum: ['nba', 'wnba', 'nfl', 'nhl', 'mlb', 'epl', 'ncaamb', 'ncaawb', 'ipl'],
					},
					team: { type: 'string' },
					opponent: { type: 'string' },
					date_from: { type: 'string' },
					date_to: { type: 'string' },
					num_games: { type: 'number' },
					locale: { type: 'string' },
				}, ['tool', 'fn', 'league']),
			},
			time: {
				type: 'array',
				items: objectSchema({ utc_offset: { type: 'string' } }, ['utc_offset']),
			},
			response_length: { type: 'string', enum: ['short', 'medium', 'long'] },
		}),
	},
	{
		name: 'image_gen.imagegen',
		description: 'Generates images from text prompts and edits uploaded images based on requested visual changes.',
		schema: objectSchema({ prompt: { type: 'string' } }),
	},
	{
		name: 'functions.exec_command',
		description: 'Runs a shell command and returns command output or a session id for ongoing interaction.',
		schema: objectSchema({
			cmd: { type: 'string' },
			justification: { type: 'string' },
			login: { type: 'boolean' },
			max_output_tokens: { type: 'number' },
			prefix_rule: stringArraySchema,
			sandbox_permissions: { type: 'string', enum: ['use_default', 'require_escalated'] },
			shell: { type: 'string' },
			tty: { type: 'boolean' },
			workdir: { type: 'string' },
			yield_time_ms: { type: 'number' },
		}, ['cmd']),
	},
	{
		name: 'functions.write_stdin',
		description: 'Writes text to a running exec_command session and returns recent output.',
		schema: objectSchema({
			session_id: { type: 'number' },
			chars: { type: 'string' },
			max_output_tokens: { type: 'number' },
			yield_time_ms: { type: 'number' },
		}, ['session_id']),
	},
	{
		name: 'functions.apply_patch',
		description: 'Applies a structured patch that adds, updates, moves, or deletes files.',
		schema: objectSchema({
			patch: { type: 'string', description: 'Freeform patch text starting with *** Begin Patch.' },
		}, ['patch']),
	},
	{
		name: 'functions.view_image',
		description: 'Opens a local image file for visual inspection.',
		schema: objectSchema({
			path: { type: 'string' },
			detail: { type: 'string', enum: ['high', 'original'] },
		}, ['path']),
	},
	{
		name: 'functions.update_plan',
		description: 'Updates a visible task plan with step status and optional explanation.',
		schema: objectSchema({
			explanation: { type: 'string' },
			plan: {
				type: 'array',
				items: objectSchema({
					step: { type: 'string' },
					status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
				}, ['step', 'status']),
			},
		}, ['plan']),
	},
	{
		name: 'functions.get_goal',
		description: 'Gets the current thread goal, status, budgets, usage, and remaining budget.',
		schema: objectSchema(),
	},
	{
		name: 'functions.create_goal',
		description: 'Creates a new active thread goal only when explicitly requested and no goal already exists.',
		schema: objectSchema({
			objective: { type: 'string' },
			token_budget: { type: 'number' },
		}, ['objective']),
	},
	{
		name: 'functions.update_goal',
		description: 'Marks an existing goal as complete or blocked under strict rules.',
		schema: objectSchema({ status: { type: 'string', enum: ['complete', 'blocked'] } }, ['status']),
	},
	{
		name: 'functions.list_mcp_resources',
		description: 'Lists resources exposed by configured MCP servers.',
		schema: objectSchema({
			cursor: { type: 'string' },
			server: { type: 'string' },
		}),
	},
	{
		name: 'functions.list_mcp_resource_templates',
		description: 'Lists parameterized resource templates exposed by configured MCP servers.',
		schema: objectSchema({
			cursor: { type: 'string' },
			server: { type: 'string' },
		}),
	},
	{
		name: 'functions.read_mcp_resource',
		description: 'Reads a specific MCP resource by server name and URI.',
		schema: objectSchema({
			server: { type: 'string' },
			uri: { type: 'string' },
		}, ['server', 'uri']),
	},
	{
		name: 'functions.request_user_input',
		description: 'Requests one to three short questions and waits for the user response.',
		schema: objectSchema({
			questions: {
				type: 'array',
				items: objectSchema({
					header: { type: 'string' },
					id: { type: 'string' },
					question: { type: 'string' },
					options: {
						type: 'array',
						items: objectSchema({
							label: { type: 'string' },
							description: { type: 'string' },
						}, ['label', 'description']),
					},
				}, ['header', 'id', 'question', 'options']),
			},
		}, ['questions']),
	},
	{
		name: 'multi_tool_use.parallel',
		description: 'Runs multiple developer tools simultaneously when the calls are independent.',
		schema: objectSchema({
			tool_uses: {
				type: 'array',
				items: objectSchema({
					recipient_name: { type: 'string' },
					parameters: { type: 'object', additionalProperties: true },
				}, ['recipient_name', 'parameters']),
			},
		}, ['tool_uses']),
	},
	{
		name: 'tool_search.tool_search_tool',
		description: 'Searches deferred tool metadata and exposes matching tools for the next model step.',
		schema: objectSchema({
			query: { type: 'string' },
			limit: { type: 'number' },
		}, ['query']),
	},
	{
		name: 'multi_agent_v1.spawn_agent',
		description: 'Starts a delegated sub-agent for a well-scoped task.',
		schema: objectSchema({
			agent_type: { type: 'string' },
			fork_context: { type: 'boolean' },
			items: { type: 'array', items: agentInputItemSchema },
			message: { type: 'string' },
			model: { type: 'string' },
			reasoning_effort: { type: 'string' },
			service_tier: { type: 'string' },
		}),
	},
	{
		name: 'multi_agent_v1.resume_agent',
		description: 'Resumes a previously closed agent by id so it can receive input or be waited on.',
		schema: objectSchema({ id: { type: 'string' } }, ['id']),
	},
	{
		name: 'multi_agent_v1.send_input',
		description: 'Sends a message or structured input items to an existing sub-agent.',
		schema: objectSchema({
			target: { type: 'string' },
			interrupt: { type: 'boolean' },
			items: { type: 'array', items: agentInputItemSchema },
			message: { type: 'string' },
		}, ['target']),
	},
	{
		name: 'multi_agent_v1.wait_agent',
		description: 'Waits for one or more sub-agents to reach a final status.',
		schema: objectSchema({
			targets: stringArraySchema,
			timeout_ms: { type: 'number' },
		}, ['targets']),
	},
	{
		name: 'multi_agent_v1.close_agent',
		description: 'Closes an agent and open descendants when they are no longer needed.',
		schema: objectSchema({ target: { type: 'string' } }, ['target']),
	},
] as const satisfies readonly ToolDefinition[];

export const requestedTools = toolDefinitions.map((definition) => ({
	...definition,
	execute: hostProvidedTool,
})) as readonly AgentTool[];
