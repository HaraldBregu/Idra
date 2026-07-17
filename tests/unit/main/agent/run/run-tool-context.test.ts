import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { realPath } from '../../../../../src/main/shared/real_path';

const getPathPermissions = jest.fn();
const getPermissionRules = jest.fn();

jest.mock('../../../../../src/main/agent/policy/policy_store', () => ({
	AGENT_DIRECTORY: '/appdata/agent',
	getPathPermissions,
	getPermissionRules,
}));

import { createContext } from '../../../../../src/main/agent/context';
import { respondToolPermission } from '../../../../../src/main/agent/policy';
import { runToolCall } from '../../../../../src/main/agent/run/run_tool_call';
import { runToolCalls } from '../../../../../src/main/agent/run/run_tool_calls';
import type { RuntimeEvent, Tool, ToolCall } from '../../../../../src/main/agent/types';

const noRules = { allow: [] as string[], deny: [] as string[], ask: [] as string[] };

beforeEach(() => {
	getPathPermissions.mockReset().mockReturnValue([]);
	getPermissionRules.mockReset().mockReturnValue(noRules);
});

describe('tool context permissions', () => {
	it('allows a new-file write and the following exact-file edit without approval', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-tools-'));
		const target = path.join(root, 'directory', 'example.txt');
		const write = jest.fn().mockResolvedValue({ path: target });
		const edit = jest.fn().mockResolvedValue({ path: target });
		const tools: Tool[] = [fakeTool('write', write), fakeTool('edit', edit)];
		const calls: ToolCall[] = [
			{ id: 'write-1', name: 'write', args: { path: target, content: 'one' } },
			{ id: 'edit-1', name: 'edit', args: { path: target, oldText: 'one', newText: 'two' } },
		];
		const context = createContext();
		const events = runToolCalls(tools, calls, true, undefined, context);
		const sequence = [
			(await events.next()).value,
			(await events.next()).value,
			(await events.next()).value,
			(await events.next()).value,
		];

		expect(sequence.map((event) => event?.type)).toEqual([
			'tool_call_start',
			'tool_call_end',
			'tool_call_start',
			'tool_call_end',
		]);
		expect(write).toHaveBeenCalledTimes(1);
		expect(edit).toHaveBeenCalledTimes(1);
		expect(context.tools).toEqual([
			{ toolName: 'write', fileName: 'example.txt', path: realPath(target) },
		]);
	});

	it('asks before editing a file that was not created in the tool context', async () => {
		const target = path.join(os.tmpdir(), 'friday-untracked', 'example.txt');
		const edit = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'edit-ask', name: 'edit', args: { path: target } };
		const events = runToolCall(fakeTool('edit', edit), call, true, undefined, createContext());

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		expect((await events.next()).value).toMatchObject({ type: 'tool_permission_request' });
		const end = events.next();
		expect(respondToolPermission(call.id, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(edit).not.toHaveBeenCalled();
	});

	it('asks before overwriting an existing file', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-overwrite-'));
		const target = path.join(root, 'example.txt');
		fs.writeFileSync(target, 'existing');
		const write = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'write-ask', name: 'write', args: { path: target } };
		const context = createContext();
		const events = runToolCall(fakeTool('write', write), call, true, undefined, context);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		expect((await events.next()).value).toMatchObject({ type: 'tool_permission_request' });
		const end = events.next();
		expect(respondToolPermission(call.id, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(write).not.toHaveBeenCalled();
		expect(context.tools).toBeUndefined();
	});

	it('does not remember a failed file creation', async () => {
		const target = path.join(os.tmpdir(), 'friday-failed', 'example.txt');
		const write = jest.fn().mockRejectedValue(new Error('failed'));
		const call: ToolCall = { id: 'write-failed', name: 'write', args: { path: target } };
		const context = createContext();
		const events = runToolCall(fakeTool('write', write), call, true, undefined, context);
		const sequence = [(await events.next()).value, (await events.next()).value];

		expect(sequence.map((event) => event?.type)).toEqual(['tool_call_start', 'tool_call_end']);
		expect(sequence.at(-1)).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(context.tools).toBeUndefined();
	});

	it('never overrides a deny rule', async () => {
		const target = path.join(os.tmpdir(), 'friday-denied', 'example.txt');
		getPathPermissions.mockReturnValue([
			{ path: path.dirname(target), allow: [], deny: ['write'], ask: [], recursive: true },
		]);
		const write = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'write-denied', name: 'write', args: { path: target } };
		const context = createContext();
		const events: RuntimeEvent[] = [];

		for await (const event of runToolCall(fakeTool('write', write), call, true, undefined, context))
			events.push(event);

		expect(events.at(-1)).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(write).not.toHaveBeenCalled();
		expect(context.tools).toBeUndefined();
	});

	it('remembers an approved read folder for the next read in that folder', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-read-folder-'));
		const firstPath = path.join(root, 'first.txt');
		const secondPath = path.join(root, 'second.txt');
		const read = jest.fn().mockResolvedValue('content');
		const context = createContext();
		const firstCall: ToolCall = { id: 'read-first', name: 'read', args: { path: firstPath } };
		const firstEvents = runToolCall(fakeTool('read', read), firstCall, true, undefined, context);

		expect((await firstEvents.next()).value).toMatchObject({ type: 'tool_call_start' });
		expect((await firstEvents.next()).value).toMatchObject({ type: 'tool_permission_request' });
		const firstEnd = firstEvents.next();
		expect(respondToolPermission(firstCall.id, 'approve')).toBe(true);
		expect((await firstEnd).value).toMatchObject({ type: 'tool_call_end', isError: undefined });
		expect(context.toolPermissions).toEqual([
			{ toolName: 'read', folderPath: realPath(root), permission: 'allow' },
		]);

		const secondCall: ToolCall = { id: 'read-second', name: 'read', args: { path: secondPath } };
		const secondEvents = runToolCall(fakeTool('read', read), secondCall, true, undefined, context);
		const sequence = [(await secondEvents.next()).value, (await secondEvents.next()).value];

		expect(sequence.map((event) => event?.type)).toEqual(['tool_call_start', 'tool_call_end']);
		expect(read).toHaveBeenCalledTimes(2);
	});

	it('asks again when the next read is in a different folder', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-read-other-'));
		const approvedFolder = path.join(root, 'approved');
		const otherFolder = path.join(root, 'other');
		const read = jest.fn().mockResolvedValue('content');
		const context = createContext();
		context.toolPermissions = [
			{ toolName: 'read', folderPath: realPath(approvedFolder), permission: 'allow' },
		];
		const call: ToolCall = {
			id: 'read-other',
			name: 'read',
			args: { path: path.join(otherFolder, 'example.txt') },
		};
		const events = runToolCall(fakeTool('read', read), call, true, undefined, context);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		expect((await events.next()).value).toMatchObject({ type: 'tool_permission_request' });
		const end = events.next();
		expect(respondToolPermission(call.id, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(read).not.toHaveBeenCalled();
	});

	it('does not remember a rejected read folder', async () => {
		const target = path.join(os.tmpdir(), 'friday-read-rejected', 'example.txt');
		const read = jest.fn().mockResolvedValue('content');
		const call: ToolCall = { id: 'read-rejected', name: 'read', args: { path: target } };
		const context = createContext();
		const events = runToolCall(fakeTool('read', read), call, true, undefined, context);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		expect((await events.next()).value).toMatchObject({ type: 'tool_permission_request' });
		const end = events.next();
		expect(respondToolPermission(call.id, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(context.toolPermissions).toBeUndefined();
	});
});

function fakeTool(name: string, run: jest.Mock): Tool {
	return { name, description: name, schema: { type: 'object' }, run };
}
