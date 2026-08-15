import type { Tool } from '../types';
import { applyPatchTool } from '../tools/core/apply_patch';
import { editTool } from '../tools/core/edit_file';
import { readTool } from '../tools/core/read_file';
import { writeTool } from '../tools/core/write_file';

export function builtinTools(): Tool[] {
	return [readTool, writeTool, editTool, applyPatchTool];
}
