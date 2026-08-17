import assert from 'node:assert/strict';
import test from 'node:test';
import { KeyedLimiter } from '../src/main/agent/limiter';
import { runSubagents } from '../src/main/agent/subagents/parallel';
import { subagentsTool } from '../src/main/agent/subagents/tool';
import type { SubagentRuntime } from '../src/main/agent/subagents/types';
import type { RuntimeInput, Tool } from '../src/main/agent/types';

const tools = ['read', 'exec', 'write', 'subagents'].map((id): Tool => ({
	id,
	name: id,
	description: id,
	schema: { type: 'object' },
	parseInput: () => ({}),
	run: () => '',
}));

function runtime(execute: NonNullable<SubagentRuntime['execute']>): SubagentRuntime {
	return {
		config: { location: process.cwd() },
		parentInput: { runId: 'parent' } as RuntimeInput,
		availableTools: tools,
		limiter: new KeyedLimiter(2),
		execute,
	};
}

test('parallel subagents preserve order, isolate failures, and enforce concurrency', async () => {
	let active = 0;
	let maximum = 0;
	const selected = new Map<string, string[]>();
	const agentRuntime = runtime(async (_runtime, request, childTools) => {
		active += 1;
		maximum = Math.max(maximum, active);
		selected.set(
			request.id,
			childTools.map((tool) => tool.id)
		);
		await new Promise((resolve) => setTimeout(resolve, request.id === 'd' ? 5 : 20));
		active -= 1;
		if (request.id === 'c') throw new Error('secret failure detail');
		return { text: request.id };
	});
	const results = await runSubagents(
		agentRuntime,
		[
			{ id: 'a', task: 'A' },
			{ id: 'b', task: 'B', tools: ['exec', 'subagents'] },
			{ id: 'c', task: 'C' },
			{ id: 'd', task: 'D' },
		],
		new AbortController().signal
	);
	assert.equal(maximum, 2);
	assert.deepEqual(
		results.map((result) => result.id),
		['a', 'b', 'c', 'd']
	);
	assert.deepEqual(
		results.map((result) => result.status),
		['completed', 'completed', 'failed', 'completed']
	);
	assert.equal(results[2]?.error, 'Subagent failed.');
	assert.deepEqual(selected.get('a'), ['read']);
	assert.deepEqual(selected.get('b'), ['exec']);
});

test('subagents tool rejects duplicate IDs and oversized batches', () => {
	const definition = subagentsTool(runtime(async () => ({ text: '' })));
	assert.equal(definition.id, 'subagents');
	assert.throws(() =>
		definition.parseInput({
			tasks: [
				{ id: 'same', task: 'A' },
				{ id: 'same', task: 'B' },
			],
		})
	);
	assert.throws(() =>
		definition.parseInput({
			tasks: Array.from({ length: 5 }, (_, index) => ({ id: String(index), task: 'Task' })),
		})
	);
});
