import type { Tool } from '../types';
import { applyPatchTool } from '../tools/apply_patch';
import { editTool } from '../tools/edit';
import { execTool } from '../tools/exec';
import { readTool } from '../tools/read';
import { writeTool } from '../tools/write';

export function builtinTools(): Tool[] {
	return [readTool, writeTool, editTool, applyPatchTool, execTool];
}
