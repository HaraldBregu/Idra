import { selectOriginTools } from '../../../../../src/main/agent/run/run_origin_tools';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import type { AgentOrigin } from '../../../../../src/shared/agent_types';

function namedTool(name: string, allowedOrigins?: AgentOrigin[]) {
	return jsonTool({
		name,
		description: name,
		allowedOrigins,
		schema: { type: 'object' },
		execute: () => undefined,
	});
}

const tools = [
	namedTool('read', ['main', 'task', 'subagent']),
	namedTool('write'),
	namedTool('apply_patch'),
	namedTool('web_search'),
	namedTool('web_fetch'),
	namedTool('exec', ['main', 'task', 'subagent']),
	namedTool('memory_list', ['main']),
	namedTool('subagent', ['main']),
];

it('gives bots unrestricted-origin tools and respects tool-specific origin restrictions', () => {
	expect(selectOriginTools(tools, 'bot').map((tool) => tool.name)).toEqual([
		'write',
		'apply_patch',
		'web_search',
		'web_fetch',
	]);
	expect(selectOriginTools(tools, 'bot', ['exec', 'memory_list'])).toEqual([]);
	expect(selectOriginTools(tools, 'bot', ['write']).map((tool) => tool.name)).toEqual(['write']);
	expect(selectOriginTools(tools, 'bot', undefined, ['web_fetch']).map((tool) => tool.name)).toEqual([
		'web_search',
	]);
});

it('gives health no tools and tasks no tools until a trusted allowlist narrows them', () => {
	expect(selectOriginTools(tools, 'health')).toEqual([]);
	expect(selectOriginTools(tools, 'task')).toEqual([]);
	expect(selectOriginTools(tools, 'task', ['exec']).map((tool) => tool.name)).toEqual(['exec']);
});

it('prevents nested subagents and respects per-tool origin restrictions', () => {
	expect(selectOriginTools(tools, 'subagent').map((tool) => tool.name)).toEqual([
		'read',
		'web_search',
		'web_fetch',
		'exec',
	]);
});
