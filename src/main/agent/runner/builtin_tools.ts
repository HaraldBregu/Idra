import type { Tool } from '../types';
import { applyPatchTool } from '../tools/apply_patch';
import { editTool } from '../tools/edit_file';
import { executeCommandTool } from '../tools/execute_command';
import { readTool } from '../tools/read_file';
import { scrapeWebsiteTool } from '../tools/scrape_website';
import { writeTool } from '../tools/write_file';

export function builtinTools(): Tool[] {
	return [
		readTool,
		writeTool,
		editTool,
		applyPatchTool,
		executeCommandTool,
		scrapeWebsiteTool,
	];
}
