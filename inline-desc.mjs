import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'src/main/tools/';

// name -> [file, description] exactly as toolDescription(name) resolves from the catalog.
const map = {
	call_mcp_tool: ['call-mcp-tool.ts', 'Call a tool on a configured MCP server.'],
	complete_task: ['complete-task.ts', 'Mark the current task or a todo item as complete.'],
	connect_mcp_server: ['connect-mcp-server.ts', 'Connect to or test a configured MCP server.'],
	grep: ['grep.ts', 'Search workspace file contents for text or regular expression matches.'],
	list_directory: ['list-directory.ts', 'List files and folders in a workspace directory.'],
	list_mcp_prompts: ['list-mcp-prompts.ts', 'List prompts exposed by a configured MCP server.'],
	list_mcp_resources: ['list-mcp-resources.ts', 'List resources exposed by a configured MCP server.'],
	list_mcp_servers: ['list-mcp-servers.ts', 'List configured MCP connector servers.'],
	list_mcp_tools: ['list-mcp-tools.ts', 'List tools exposed by a configured MCP server.'],
	list_skills: ['list-skills.ts', 'List installed skills available to the agent.'],
	list_todos: ['list-todos.ts', 'List the current run todo items and statuses.'],
	load_mcp_prompt: ['load-mcp-prompt.ts', 'Load a prompt from a configured MCP server.'],
	load_mcp_tool: ['load-mcp-tool.ts', 'Load schema and metadata for one MCP tool.'],
	load_skill: ['load-skill.ts', 'Load instructions and support file metadata for an installed skill.'],
	open_browser: ['open-browser.ts', "Open an HTTP or HTTPS URL in the user's default browser."],
	present_plan: ['present-plan.ts', 'Present a plan for human review before taking action.'],
	read_mcp_resource: ['read-mcp-resource.ts', 'Read a resource from a configured MCP server.'],
	read_scratch: ['read-scratch.ts', 'Read run-local scratch notes.'],
	refresh_mcp_server: ['refresh-mcp-server.ts', 'Refresh a configured MCP server and its discovered capabilities.'],
	request_approval: ['request-approval.ts', 'Ask a human to approve or deny a proposed action.'],
	request_authorization: ['request-authorization.ts', 'Request explicit authorization for sensitive or external actions.'],
	request_clarification: ['request-clarification.ts', 'Ask a focused clarification question before continuing.'],
	run_shell: ['run-shell.ts', 'Run a shell command in the workspace with captured output.'],
	spawn_subagent: ['spawn-subagent.ts', 'Start a child agent run for a clearly scoped task.'],
	undo_last_operation: ['undo-last-operation.ts', 'Undo the most recent reversible workspace tool operation.'],
	update_todo: ['update-todo.ts', 'Update one item in the current run todo list.'],
	use_skill: ['use-skill.ts', 'Select and load a skill for the current task.'],
	web_fetch: ['web-fetch.ts', 'Fetch an HTTP or HTTPS URL and return readable text capped at 1 MB.'],
	write_scratch: ['write-scratch.ts', 'Write run-local scratch notes for later tool calls.'],
	write_todos: ['write-todos.ts', 'Replace the current run todo list.'],
};

function literal(desc) {
	return desc.includes("'") ? JSON.stringify(desc) : `'${desc}'`;
}

for (const [name, [file, desc]] of Object.entries(map)) {
	const full = dir + file;
	let text = readFileSync(full, 'utf8');
	const callLine = `\tdescription: toolDescription('${name}'),`;
	const replacement = `\tdescription: ${literal(desc)},`;
	if (!text.includes(callLine)) throw new Error(`call site not found in ${file}`);
	text = text.replace(callLine, replacement);
	const importLine = "import { toolDescription } from './base/metadata';\n";
	if (!text.includes(importLine)) throw new Error(`import not found in ${file}`);
	text = text.replace(importLine, '');
	writeFileSync(full, text);
	console.log(`updated ${file}`);
}
