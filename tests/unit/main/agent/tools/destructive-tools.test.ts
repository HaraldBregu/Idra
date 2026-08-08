import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyPatchTool } from '../../../../../src/main/agent/tools/file/apply_patch';
import { writeTool } from '../../../../../src/main/agent/tools/file/write';
import { execTool } from '../../../../../src/main/agent/tools/run_exec';
import { processTool } from '../../../../../src/main/agent/tools/run_process';
import type { Tool } from '../../../../../src/main/agent/types';

function requiresHardApproval(tool: Tool, input: Record<string, unknown>): boolean {
	return typeof tool.hardApproval === 'function'
		? tool.hardApproval(input)
		: tool.hardApproval === true;
}

it('classifies destructive shell and process operations as hard approvals', () => {
	expect(requiresHardApproval(execTool, { command: 'rm -rf ./build' })).toBe(true);
	expect(requiresHardApproval(execTool, { command: 'git reset --hard HEAD~1' })).toBe(true);
	expect(requiresHardApproval(execTool, { command: 'npm test' })).toBe(false);
	expect(requiresHardApproval(processTool, { action: 'kill', sessionId: 'session' })).toBe(true);
	expect(requiresHardApproval(processTool, { action: 'log', sessionId: 'session' })).toBe(false);
});

it('classifies file deletion and overwrite as hard approvals', () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-destructive-tool-'));
	const existing = path.join(directory, 'existing.txt');
	fs.writeFileSync(existing, 'content');

	expect(
		requiresHardApproval(applyPatchTool, {
			input: '*** Begin Patch\n*** Delete File: /tmp/example\n*** End Patch',
		})
	).toBe(true);
	expect(
		requiresHardApproval(applyPatchTool, {
			input: '*** Begin Patch\n*** Add File: /tmp/example\n+content\n*** End Patch',
		})
	).toBe(false);
	expect(requiresHardApproval(writeTool, { path: existing, content: 'replacement' })).toBe(true);
	expect(
		requiresHardApproval(writeTool, { path: path.join(directory, 'new.txt'), content: 'new' })
	).toBe(false);
});
