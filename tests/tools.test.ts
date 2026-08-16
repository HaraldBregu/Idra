import assert from 'node:assert/strict';
import test from 'node:test';
import { builtinTools } from '../src/main/agent/runner/builtin_tools';
import { execTool } from '../src/main/agent/tools/exec';

test('built-in command tool is named exec throughout the registry', () => {
	assert.equal(execTool.id, 'exec');
	assert.equal(execTool.name, 'Exec');
	assert.deepEqual(
		builtinTools().map((tool) => tool.id),
		['read_file', 'write_file', 'edit_file', 'apply_patch', 'exec']
	);
});
