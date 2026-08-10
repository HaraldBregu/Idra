import { runToolCall } from '../../../../../src/main/agent/run/run_tool_call';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import type { ToolCall } from '../../../../../src/main/agent/types';
import { KeyedMutex } from '../../../../../src/main/agent/mutex';

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('runToolCall', () => {
	it('propagates cancellation to the tool and stops waiting', async () => {
		const controller = new AbortController();
		let receivedSignal: AbortSignal | undefined;
		const tool = jsonTool({
			name: 'web_search',
			description: 'inspect',
			schema: { type: 'object' },
			execute: (_input, signal) => {
				receivedSignal = signal;
				return new Promise(() => undefined);
			},
		});
		const call: ToolCall = { id: 'tool-1', name: 'web_search', args: {} };
		const events = runToolCall(tool, call, false, controller.signal);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const pending = events.next();
		controller.abort(new Error('cancelled'));

		await expect(pending).rejects.toThrow('cancelled');
		expect(receivedSignal?.aborted).toBe(true);
		expect(call.result).toBeUndefined();
	});

	it('bypasses policy checks only when explicitly requested', async () => {
		const run = jest.fn().mockResolvedValue('done');
		const tool = jsonTool({
			name: 'restricted_tool',
			description: 'run',
			schema: { type: 'object' },
			defaultPermission: 'ask',
			execute: run,
		});
		const call: ToolCall = {
			id: 'tool-1',
			name: 'restricted_tool',
			args: { command: 'echo done' },
		};
		const events = [];

		for await (const event of runToolCall(tool, call, false, undefined, undefined, 'bypass')) {
			events.push(event);
		}

		expect(run).toHaveBeenCalledWith({ command: 'echo done' }, expect.any(AbortSignal));
		expect(events).not.toContainEqual(expect.objectContaining({ type: 'tool_permission_request' }));

		const restrictedCall: ToolCall = {
			id: 'tool-2',
			name: 'restricted_tool',
			args: { command: 'echo blocked' },
		};
		for await (const event of runToolCall(tool, restrictedCall, false)) events.push(event);
		expect(run).toHaveBeenCalledTimes(1);
		expect(restrictedCall.result).toMatchObject({ isError: true });
	});

	it('runs a non-interactive tool when the injected policy allows it', async () => {
		const run = jest.fn().mockResolvedValue('done');
		const tool = jsonTool({
			name: 'background_tool',
			description: 'run',
			schema: { type: 'object' },
			defaultPermission: 'ask',
			execute: run,
		});
		const call: ToolCall = { id: 'tool-3', name: tool.name, args: {} };
		for await (const _event of runToolCall(
			tool,
			call,
			false,
			undefined,
			undefined,
			'ask',
			undefined,
			{
				mode: 'ask',
				dir: {},
				background_tool: { default: 'allow', allow: [], deny: [], ask: [] },
			}
		))
			void _event;

		expect(run).toHaveBeenCalledTimes(1);
		expect(call.result).toMatchObject({ content: 'done', isError: undefined });
	});

	it('serializes matching exclusive targets through the shared resource mutex', async () => {
		let releaseFirst = () => {};
		let markFirstStarted = () => {};
		const firstStarted = new Promise<void>((resolve) => {
			markFirstStarted = resolve;
		});
		const first = jsonTool({
			name: 'first_write',
			description: 'write',
			effect: 'write',
			defaultPermission: 'allow',
			exclusiveTargets: () => ['/workspace/shared.md'],
			schema: { type: 'object' },
			execute: async () => {
				markFirstStarted();
				await new Promise<void>((done) => {
					releaseFirst = done;
				});
			},
		});
		let secondRan = false;
		const second = jsonTool({
			name: 'second_write',
			description: 'write',
			effect: 'write',
			defaultPermission: 'allow',
			exclusiveTargets: () => ['/workspace/shared.md'],
			schema: { type: 'object' },
			execute: () => {
				secondRan = true;
			},
		});
		const resources = new KeyedMutex();
		const consume = async (tool: typeof first, id: string): Promise<void> => {
			for await (const _event of runToolCall(
				tool,
				{ id, name: tool.name, args: {} },
				false,
				undefined,
				undefined,
				'ask',
				undefined,
				undefined,
				resources
			))
				void _event;
		};
		const firstRun = consume(first, 'first');
		await firstStarted;
		const secondRun = consume(second, 'second');
		await flush();
		expect(secondRan).toBe(false);

		releaseFirst();
		await Promise.all([firstRun, secondRun]);
		expect(secondRan).toBe(true);
	});

	it('releases exclusive targets after tool failure', async () => {
		const resources = new KeyedMutex();
		const failed = jsonTool({
			name: 'failed_write',
			description: 'write',
			effect: 'write',
			defaultPermission: 'allow',
			exclusiveTargets: () => ['/workspace/shared.md'],
			schema: { type: 'object' },
			execute: () => {
				throw new Error('disk failed');
			},
		});
		for await (const _event of runToolCall(
			failed,
			{ id: 'failed', name: failed.name, args: {} },
			false,
			undefined,
			undefined,
			'ask',
			undefined,
			undefined,
			resources
		))
			void _event;
		const release = await resources.acquire(['/workspace/shared.md']);
		release();
	});
});
