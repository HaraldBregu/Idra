import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import {
	createAgentContext,
	createReadFileTool,
	createWriteFileTool,
	QueryEngine,
	query,
	runToolUse,
	type ModelClient,
	type Tool,
} from '../../../../src/main/agent/execution/looptime';

describe('layered agent runtime', () => {
	it('exposes QueryEngine as the runtime entrypoint facade', async () => {
		const model: ModelClient = {
			async *stream() {
				yield { type: 'text_delta', text: 'ready' };
				yield { type: 'message_end' };
			},
		};
		const context = createAgentContext({ tools: [] });
		const engine = new QueryEngine(model);
		const events = [];

		for await (const event of engine.run({
			context,
			messages: [{ role: 'user', content: 'hello' }],
			systemPrompt: 'system',
		})) {
			events.push(event);
		}

		expect(events).toEqual([
			{ type: 'assistant_message', message: { role: 'assistant', content: 'ready', toolCalls: [] } },
		]);
	});

	it('continues the model loop after tool results', async () => {
		const lookup: Tool<{ q: string }, string> = {
			name: 'Lookup',
			description: 'Lookup data',
			inputSchema: z.object({ q: z.string() }),
			async prompt() {
				return 'Lookup data.';
			},
			checkPermissions() {
				return { behavior: 'allow' };
			},
			async call(input) {
				return { data: `result:${input.q}` };
			},
			isReadOnly() {
				return true;
			},
		};
		const model: ModelClient = {
			async *stream(request) {
				if (!request.messages.some((message) => message.role === 'tool')) {
					yield { type: 'tool_call', toolCall: { id: 'tc1', name: 'Lookup', input: { q: 'friday' } } };
					yield { type: 'message_end' };
					return;
				}
				yield { type: 'text_delta', text: 'done' };
				yield { type: 'message_end' };
			},
		};
		const context = createAgentContext({ tools: [lookup as Tool<unknown, unknown>] });
		const events = [];

		for await (const event of query({
			model,
			context,
			messages: [{ role: 'user', content: 'answer' }],
			systemPrompt: 'system',
		})) {
			events.push(event);
		}

		expect(events.map((event) => event.type)).toEqual([
			'assistant_message',
			'tool_result',
			'assistant_message',
		]);
		expect(events[1].message).toMatchObject({
			role: 'tool',
			content: '"result:friday"',
		});
	});

	it('asks for permission before side effects and uses approved input', async () => {
		const execute = jest.fn(async (input: { value: string }) => ({ data: input.value }));
		const tool: Tool<{ value: string }, string> = {
			name: 'Mutate',
			description: 'Mutate state',
			inputSchema: z.object({ value: z.string() }),
			async prompt() {
				return 'Mutate state.';
			},
			checkPermissions(input) {
				return { behavior: 'ask', message: 'approve mutation', input };
			},
			call: execute,
			isReadOnly() {
				return false;
			},
		};
		const context = createAgentContext({
			tools: [tool as Tool<unknown, unknown>],
			permissionContext: {
				requestApproval: jest.fn(async () => ({ behavior: 'allow', input: { value: 'approved' } })),
			},
		});

		const result = await runToolUse({ id: 'tc1', name: 'Mutate', input: { value: 'draft' } }, context);

		expect(result).toMatchObject({ role: 'tool', content: '"approved"' });
		expect(execute).toHaveBeenCalledWith({ value: 'approved' }, context);
	});

	it('enforces read-before-write and detects changed files', async () => {
		const dir = join(tmpdir(), `friday-runtime-${Date.now()}`);
		await mkdir(dir, { recursive: true });
		const file = join(dir, 'note.txt');
		await writeFile(file, 'before', 'utf8');
		const readTool = createReadFileTool();
		const writeTool = createWriteFileTool();
		const context = createAgentContext({
			tools: [readTool as Tool<unknown, unknown>, writeTool as Tool<unknown, unknown>],
			permissionContext: {
				additionalWorkingDirectories: [dir],
				requestApproval: jest.fn(async () => ({ behavior: 'allow' })),
			},
		});

		const blocked = await runToolUse({
			id: 'tc1',
			name: 'WriteFile',
			input: { path: file, content: 'blocked' },
		}, context);
		expect(blocked).toMatchObject({ isError: true, content: 'File must be read before writing.' });

		await runToolUse({ id: 'tc2', name: 'ReadFile', input: { path: file } }, context);
		await writeFile(file, 'outside change', 'utf8');
		await expect(writeTool.call({ path: file, content: 'after' }, context)).rejects.toThrow('File changed since last read.');

		await runToolUse({ id: 'tc3', name: 'ReadFile', input: { path: file } }, context);
		const written = await runToolUse({
			id: 'tc4',
			name: 'WriteFile',
			input: { path: file, content: 'after' },
		}, context);
		await expect(readFile(file, 'utf8')).resolves.toBe('after');
		expect(written).not.toHaveProperty('isError');
	});
});
