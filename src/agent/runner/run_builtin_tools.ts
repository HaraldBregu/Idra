import type { AgentInteractionMode } from '../../../shared/agent_types';
import type { Config, Tool } from '../types';
import type { ExecSandbox } from '../sandbox';
import { completeBootstrapTool } from '../tools/assistant/complete_bootstrap';
import { applyPatchTool } from '../tools/core/apply_patch';
import { editTool } from '../tools/core/edit_file';
import { execTool } from '../tools/core/exec_command';
import { processTool } from '../tools/core/process';
import { readTool } from '../tools/core/read_file';
import { writeTool } from '../tools/core/write_file';
import { forgetMemoryTool } from '../tools/memory/forget_memory';
import { listMemoriesTool } from '../tools/memory/list_memories';
import { saveMemoryTool } from '../tools/memory/save_memory';
import { fetchWebPageTool } from '../tools/web/fetch_web_page';

export function builtinTools(
	config: Config,
	sandbox: ExecSandbox,
	interactionMode: AgentInteractionMode = 'default'
): Tool[] {
	return [
		readTool,
		writeTool,
		editTool,
		applyPatchTool,
		execTool(sandbox, interactionMode),
		processTool,
		fetchWebPageTool,
		saveMemoryTool(config),
		forgetMemoryTool(config),
		listMemoriesTool(config),
		completeBootstrapTool,
	];
}
