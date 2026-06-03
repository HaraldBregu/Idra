import { createAgentTools, ToolService } from '../../../../src/main/tools';

const REQUESTED_TOOL_NAMES = [
	'web.run',
	'image_gen.imagegen',
	'functions.exec_command',
	'functions.write_stdin',
	'functions.apply_patch',
	'functions.view_image',
	'functions.update_plan',
	'functions.get_goal',
	'functions.create_goal',
	'functions.update_goal',
	'functions.list_mcp_resources',
	'functions.list_mcp_resource_templates',
	'functions.read_mcp_resource',
	'functions.request_user_input',
	'multi_tool_use.parallel',
	'tool_search.tool_search_tool',
	'multi_agent_v1.spawn_agent',
	'multi_agent_v1.resume_agent',
	'multi_agent_v1.send_input',
	'multi_agent_v1.wait_agent',
	'multi_agent_v1.close_agent',
] as const;

const REMOVED_TOOL_NAMES = [
	'workspace',
	'exec',
	'process',
	'web_fetch',
	'open_browser',
	'script_run',
	'cron_create',
	'cron_read',
	'cron_update',
	'cron_delete',
	'cron_list',
	'cron_start',
	'cron_stop',
	'cron_run',
	'write_todos',
	'update_todo',
	'list_todos',
	'complete_task',
	'write_scratch',
	'read_scratch',
	'request_approval',
	'request_clarification',
	'present_plan',
	'request_authorization',
	'spawn_subagent',
	'skill_list',
	'skill_load',
	'skill_use',
	'mcp_list_servers',
	'mcp_connect_server',
	'mcp_refresh_server',
	'mcp_list_tools',
	'mcp_load_tool',
	'mcp_call_tool',
	'mcp_list_resources',
	'mcp_read_resource',
	'mcp_list_prompts',
	'mcp_load_prompt',
	'startup_files',
];

describe('tool registry organization', () => {
	it('uses only the requested run-scoped tools by default', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
		});

		try {
			expect(result.tools.map((tool) => tool.name).sort()).toEqual(
				[...REQUESTED_TOOL_NAMES].sort()
			);
		} finally {
			await result.dispose();
		}
	});

	it('uses only the requested local catalog tools by default', () => {
		const names = new ToolService().createDefaultTools({}).map((tool) => tool.name);

		expect(names.sort()).toEqual([...REQUESTED_TOOL_NAMES].sort());
	});

	it('can expose one requested tool by allowlist', async () => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
			toolsAllow: ['functions.exec_command'],
		});

		try {
			expect(result.tools.map((tool) => tool.name)).toEqual(['functions.exec_command']);
		} finally {
			await result.dispose();
		}
	});

	it.each(REMOVED_TOOL_NAMES)('does not resolve removed tool %s by allowlist', async (toolName) => {
		const result = await createAgentTools({
			workspaceDir: process.cwd(),
			toolsAllow: [toolName],
		});

		try {
			expect(result.tools.map((tool) => tool.name)).not.toContain(toolName);
		} finally {
			await result.dispose();
		}
	});
});
