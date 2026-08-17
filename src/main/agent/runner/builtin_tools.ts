import type { Tool } from '../types';
import { patchTool } from '../tools/patch';
import { editTool } from '../tools/edit';
import { bashTool } from '../tools/bash';
import { readTool } from '../tools/read';
import { writeTool } from '../tools/write';

export function builtinTools(): Tool[] {
	return [readTool, writeTool, editTool, patchTool, bashTool];
}
