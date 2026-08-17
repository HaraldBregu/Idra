import assert from 'node:assert/strict';
import test from 'node:test';
import { builtinTools } from '../src/main/agent/runner/builtin_tools';
import { bashTool } from '../src/main/agent/tools/bash';

test('built-in command tool is named bash throughout the registry', () => {
	assert.equal(bashTool.id, 'bash');
	assert.equal(bashTool.name, 'Bash');
	assert.deepEqual(
		builtinTools().map((tool) => tool.id),
		['read', 'write', 'edit', 'patch', 'bash']
	);
});
