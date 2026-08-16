import type { Tool } from '../types';
import { applyPatchTool } from '../tools/apply_patch';
import { editTool } from '../tools/edit_file';
import { execTool } from '../tools/exec';
import { readTool } from '../tools/read_file';
import { writeTool } from '../tools/write_file';

export function builtinTools(): Tool[] {
	return [readTool, writeTool, editTool, applyPatchTool, execTool];
}
