import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { realPath } from '../../../../../src/main/shared/real_path';

const getPermissions = jest.fn();
const addPermissionRule = jest.fn();
const getToolPermission = jest.fn();
const setToolPermission = jest.fn();

jest.mock('../../../../../src/main/agent/agent_store', () => ({
	AGENT_DIRECTORY: '/appdata/agent',
	addPermissionRule,
	getPermissions,
	getToolPermission,
	setToolPermission,
}));

import { createContext, fileToolState, rememberTool } from '../../../../../src/main/agent/context';
import { respondToolPermission } from '../../../../../src/main/agent/policy';
import { runToolCall } from '../../../../../src/main/agent/run/run_tool_call';
import { runToolCalls } from '../../../../../src/main/agent/run/run_tool_calls';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import { readTool } from '../../../../../src/main/agent/tools/file/read';
import { execTool } from '../../../../../src/main/agent/tools/run_exec';
import type { RuntimeEvent, Tool, ToolCall } from '../../../../../src/main/agent/types';

const asking = { default: 'ask' as const, allow: [], deny: [], ask: [] };
const askingPermissions = {
	dir: {},
	read: asking,
	write: asking,
	edit: asking,
	apply_patch: asking,
	exec: asking,
};

beforeEach(() => {
	addPermissionRule.mockReset();
	getToolPermission.mockReset().mockReturnValue(asking);
	getPermissions.mockReset().mockReturnValue(askingPermissions);
	setToolPermission.mockReset();
});

describe('tool context permissions', () => {
	it.each(["bash -lc 'rm -rf ./build'", 'cat ~/.ssh/id_rsa'])(
		'requires hard approval through trusted-main bypass for exec: %s',
		async (command) => {
			const events = runToolCall(
				execTool,
				{ id: 'dangerous-exec', name: 'exec', args: { command } },
				true,
				undefined,
				createContext().toolsContext,
				'bypass'
			);
			expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
			const request = (await events.next()).value;
			expect(request).toMatchObject({ type: 'tool_permission_request', hardApproval: true });
			if (!request || request.type !== 'tool_permission_request')
				throw new Error('Expected approval');
			const end = events.next();
			expect(respondToolPermission(request.approvalId, 'reject')).toBe(true);
			expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		}
	);

	it('keeps an explicit credential-path deny ahead of trusted-main bypass', async () => {
		getPermissions.mockReturnValue({
			...askingPermissions,
			read: { ...asking, deny: ['/appdata/agent/.env'] },
		});
		const events: RuntimeEvent[] = [];
		for await (const event of runToolCall(
			readTool,
			{ id: 'credential-deny', name: 'read', args: { path: '/appdata/agent/.env' } },
			true,
			undefined,
			createContext().toolsContext,
			'bypass'
		))
			events.push(event);
		expect(events.some((event) => event.type === 'tool_permission_request')).toBe(false);
		expect(events.at(-1)).toMatchObject({ type: 'tool_call_end', isError: true });
	});

	it('requires hard approval for a credential read even when workspace policy and bypass allow it', async () => {
		const events = runToolCall(
			readTool,
			{ id: 'credential-ask', name: 'read', args: { path: '/appdata/agent/.env' } },
			true,
			undefined,
			createContext().toolsContext,
			'bypass'
		);
		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({ type: 'tool_permission_request', hardApproval: true });
		if (!request || request.type !== 'tool_permission_request')
			throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
	});

	it('allows a new-file write and the following exact-file edit without approval', async () => {
		getPermissions.mockReturnValue({
			...askingPermissions,
			write: { ...asking, default: 'allow' },
		});
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-tools-'));
		const target = path.join(root, 'directory', 'example.txt');
		const write = jest.fn().mockResolvedValue({ path: target });
		const edit = jest.fn().mockResolvedValue({ path: target });
		const tools: Tool[] = [fakeTool('write', write), fakeTool('edit', edit)];
		const calls: ToolCall[] = [
			{ id: 'write-1', name: 'write', args: { path: target, content: 'one' } },
			{ id: 'edit-1', name: 'edit', args: { path: target, oldText: 'one', newText: 'two' } },
		];
		const context = createContext().toolsContext;
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
			{
				toolName: 'write',
				fileName: 'example.txt',
				path: realPath(target),
				folderPath: realPath(path.dirname(target)),
			},
		]);
	});

	it('denies a non-interactive ask instead of auto-allowing a new file', async () => {
		const target = path.join(os.tmpdir(), 'friday-noninteractive', 'example.txt');
		const write = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'write-background', name: 'write', args: { path: target } };
		const events: RuntimeEvent[] = [];

		for await (const event of runToolCall(
			fakeTool('write', write),
			call,
			false,
			undefined,
			createContext().toolsContext
		))
			events.push(event);

		expect(events.some((event) => event.type === 'tool_permission_request')).toBe(false);
		expect(events.at(-1)).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(write).not.toHaveBeenCalled();
	});

	it('persists always-allow as the default for a targetless tool', async () => {
		const run = jest.fn().mockResolvedValue('done');
		const call: ToolCall = { id: 'targetless-always', name: 'inspect', args: {} };
		const events = runToolCall(
			fakeTool('inspect', run),
			call,
			true,
			undefined,
			createContext().toolsContext
		);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({ type: 'tool_permission_request' });
		if (!request || request.type !== 'tool_permission_request')
			throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'approve_always')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: undefined });
		expect(setToolPermission).toHaveBeenCalledWith('inspect', {
			...asking,
			default: 'allow',
		});
		expect(run).toHaveBeenCalledTimes(1);
	});

	it('asks before editing a file that was not created in the tool context', async () => {
		const target = path.join(os.tmpdir(), 'friday-untracked', 'example.txt');
		const edit = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'edit-ask', name: 'edit', args: { path: target } };
		const events = runToolCall(
			fakeTool('edit', edit),
			call,
			true,
			undefined,
			createContext().toolsContext
		);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({ type: 'tool_permission_request' });
		if (!request || request.type !== 'tool_permission_request')
			throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(edit).not.toHaveBeenCalled();
	});

	it('asks before overwriting an existing file', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-overwrite-'));
		const target = path.join(root, 'example.txt');
		fs.writeFileSync(target, 'existing');
		const write = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'write-ask', name: 'write', args: { path: target } };
		const context = createContext().toolsContext;
		const events = runToolCall(fakeTool('write', write), call, true, undefined, context);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({ type: 'tool_permission_request' });
		if (!request || request.type !== 'tool_permission_request')
			throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(write).not.toHaveBeenCalled();
		expect(context.tools).toBeUndefined();
	});

	it('does not remember a failed file creation', async () => {
		getPermissions.mockReturnValue({
			...askingPermissions,
			write: { ...asking, default: 'allow' },
		});
		const target = path.join(os.tmpdir(), 'friday-failed', 'example.txt');
		const write = jest.fn().mockRejectedValue(new Error('failed'));
		const call: ToolCall = { id: 'write-failed', name: 'write', args: { path: target } };
		const context = createContext().toolsContext;
		const events = runToolCall(fakeTool('write', write), call, true, undefined, context);
		const sequence = [(await events.next()).value, (await events.next()).value];

		expect(sequence.map((event) => event?.type)).toEqual(['tool_call_start', 'tool_call_end']);
		expect(sequence.at(-1)).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(context.tools).toBeUndefined();
	});

	it('never overrides a deny rule', async () => {
		const target = path.join(os.tmpdir(), 'friday-denied', 'example.txt');
		getPermissions.mockReturnValue({
			...askingPermissions,
			write: { ...asking, deny: [path.dirname(target)] },
		});
		const write = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'write-denied', name: 'write', args: { path: target } };
		const context = createContext().toolsContext;
		const events: RuntimeEvent[] = [];

		for await (const event of runToolCall(fakeTool('write', write), call, true, undefined, context))
			events.push(event);

		expect(events.at(-1)).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(write).not.toHaveBeenCalled();
		expect(context.tools).toBeUndefined();
	});

	it('falls through to an allowing tool policy when a directory omits the tool', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-dir-denied-'));
		const target = path.join(root, 'example.txt');
		getPermissions.mockReturnValue({
			...askingPermissions,
			dir: { [root]: { recoursive: true, tools: ['read'] } },
			write: { ...asking, default: 'allow' },
		});
		const write = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'write-dir-denied', name: 'write', args: { path: target } };
		const events: RuntimeEvent[] = [];

		for await (const event of runToolCall(fakeTool('write', write), call, true)) events.push(event);

		expect(events.some((event) => event.type === 'tool_permission_request')).toBe(false);
		expect(events.at(-1)).toMatchObject({ type: 'tool_call_end', isError: undefined });
		expect(write).toHaveBeenCalledTimes(1);
	});

	it('does not let the system directory override a stored deny', async () => {
		const target = '/appdata/agent/nested/example.txt';
		getPermissions.mockReturnValue({
			...askingPermissions,
			write: { ...asking, default: 'deny', deny: ['/appdata/agent'] },
		});
		const write = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'write-system-allowed', name: 'write', args: { path: target } };
		const events: RuntimeEvent[] = [];

		for await (const event of runToolCall(fakeTool('write', write), call, true)) events.push(event);

		expect(events.some((event) => event.type === 'tool_permission_request')).toBe(false);
		expect(events.at(-1)).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(write).not.toHaveBeenCalled();
	});

	it('runs a tool allowed by a matching directory', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-dir-allowed-'));
		const target = path.join(root, 'example.txt');
		getPermissions.mockReturnValue({
			...askingPermissions,
			dir: { [root]: { recoursive: true, tools: ['edit'] } },
		});
		const edit = jest.fn().mockResolvedValue({ path: target });
		const call: ToolCall = { id: 'edit-dir-allowed', name: 'edit', args: { path: target } };
		const events: RuntimeEvent[] = [];

		for await (const event of runToolCall(fakeTool('edit', edit), call, true)) events.push(event);

		expect(events.some((event) => event.type === 'tool_permission_request')).toBe(false);
		expect(events.at(-1)).toMatchObject({ type: 'tool_call_end', isError: undefined });
		expect(edit).toHaveBeenCalledTimes(1);
	});

	it.each(['approve', 'approve_always'] as const)(
		'remembers an %s read folder for the next read in that folder',
		async (decision) => {
			const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-read-folder-'));
			const firstPath = path.join(root, 'first.txt');
			const secondPath = path.join(root, 'second.txt');
			const read = jest.fn().mockResolvedValue('content');
			const context = createContext().toolsContext;
			const firstCall: ToolCall = { id: 'read-first', name: 'read', args: { path: firstPath } };
			const firstEvents = runToolCall(fakeTool('read', read), firstCall, true, undefined, context);

			expect((await firstEvents.next()).value).toMatchObject({ type: 'tool_call_start' });
			const request = (await firstEvents.next()).value;
			expect(request).toMatchObject({ type: 'tool_permission_request' });
			if (!request || request.type !== 'tool_permission_request')
				throw new Error('Expected approval');
			const firstEnd = firstEvents.next();
			expect(respondToolPermission(request.approvalId, decision)).toBe(true);
			expect((await firstEnd).value).toMatchObject({ type: 'tool_call_end', isError: undefined });
			expect(context.tools).toEqual([
				{
					toolName: 'read',
					fileName: 'first.txt',
					path: realPath(firstPath),
					folderPath: realPath(root),
				},
			]);

			const secondCall: ToolCall = { id: 'read-second', name: 'read', args: { path: secondPath } };
			const secondEvents = runToolCall(
				fakeTool('read', read),
				secondCall,
				true,
				undefined,
				context
			);
			const sequence = [(await secondEvents.next()).value, (await secondEvents.next()).value];

			expect(sequence.map((event) => event?.type)).toEqual(['tool_call_start', 'tool_call_end']);
			expect(read).toHaveBeenCalledTimes(2);
			if (decision === 'approve_always')
				expect(addPermissionRule).toHaveBeenCalledWith('read', 'allow', realPath(root));
		}
	);

	it('asks again when the next read is in a different folder', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-read-other-'));
		const approvedFolder = path.join(root, 'approved');
		const otherFolder = path.join(root, 'other');
		const read = jest.fn().mockResolvedValue('content');
		const context = createContext().toolsContext;
		context.tools = [
			{
				toolName: 'read',
				fileName: 'approved.txt',
				path: realPath(path.join(approvedFolder, 'approved.txt')),
				folderPath: realPath(approvedFolder),
			},
		];
		const call: ToolCall = {
			id: 'read-other',
			name: 'read',
			args: { path: path.join(otherFolder, 'example.txt') },
		};
		const events = runToolCall(fakeTool('read', read), call, true, undefined, context);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({ type: 'tool_permission_request' });
		if (!request || request.type !== 'tool_permission_request')
			throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(read).not.toHaveBeenCalled();
	});

	it('does not remember a rejected read folder', async () => {
		const target = path.join(os.tmpdir(), 'friday-read-rejected', 'example.txt');
		const read = jest.fn().mockResolvedValue('content');
		const call: ToolCall = { id: 'read-rejected', name: 'read', args: { path: target } };
		const context = createContext().toolsContext;
		const events = runToolCall(fakeTool('read', read), call, true, undefined, context);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({ type: 'tool_permission_request' });
		if (!request || request.type !== 'tool_permission_request')
			throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(context.tools).toBeUndefined();
	});

	it('does not override a read deny with an allowed folder context', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-read-denied-'));
		const target = path.join(root, 'example.txt');
		getPermissions.mockReturnValue({
			...askingPermissions,
			read: { ...asking, deny: [root] },
		});
		const read = jest.fn().mockResolvedValue('content');
		const call: ToolCall = { id: 'read-denied', name: 'read', args: { path: target } };
		const context = createContext().toolsContext;
		rememberTool(context, fileToolState('read', call.args, '/appdata/agent')!);
		const events: RuntimeEvent[] = [];

		for await (const event of runToolCall(fakeTool('read', read), call, true, undefined, context))
			events.push(event);

		expect(events.some((event) => event.type === 'tool_permission_request')).toBe(false);
		expect(events.at(-1)).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(read).not.toHaveBeenCalled();
	});

	it('does not override an explicit ask with an allowed folder context', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-read-explicit-ask-'));
		const target = path.join(root, 'example.txt');
		getPermissions.mockReturnValue({
			...askingPermissions,
			read: { ...asking, ask: [target] },
		});
		const read = jest.fn().mockResolvedValue('content');
		const call: ToolCall = { id: 'read-explicit-ask', name: 'read', args: { path: target } };
		const context = createContext().toolsContext;
		rememberTool(context, fileToolState('read', call.args, '/appdata/agent')!);
		const events = runToolCall(fakeTool('read', read), call, true, undefined, context);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({ type: 'tool_permission_request' });
		if (!request || request.type !== 'tool_permission_request')
			throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(read).not.toHaveBeenCalled();
	});

	it('requires a non-persistent approval before private read context reaches an external tool', async () => {
		const context = createContext().toolsContext;
		context.hasPrivateContext = true;
		const send = jest.fn().mockResolvedValue('sent');
		const external = jsonTool({
			name: 'external_send',
			description: 'send externally',
			defaultPermission: 'allow',
			risk: 'medium',
			effect: 'external',
			schema: { type: 'object' },
			execute: send,
		});
		const call: ToolCall = { id: 'external-after-read', name: external.name, args: {} };
		const events = runToolCall(external, call, true, undefined, context, 'bypass');

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({
			type: 'tool_permission_request',
			hardApproval: true,
			effect: 'external',
		});
		if (!request || request.type !== 'tool_permission_request')
			throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'approve_always')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: undefined });
		expect(send).toHaveBeenCalledTimes(1);
		expect(setToolPermission).not.toHaveBeenCalled();
	});

	it('marks non-public tool output private before a later external call', async () => {
		const context = createContext().toolsContext;
		const knowledge = jsonTool({
			name: 'knowledge_query',
			description: 'private knowledge',
			defaultPermission: 'allow',
			risk: 'low',
			effect: 'read',
			schema: { type: 'object' },
			execute: () => 'private result',
		});
		for await (const event of runToolCall(
			knowledge,
			{ id: 'private-source', name: knowledge.name, args: {} },
			true,
			undefined,
			context,
			'bypass'
		))
			void event;
		expect(context.hasPrivateContext).toBe(true);

		const external = jsonTool({
			name: 'external_send',
			description: 'send externally',
			defaultPermission: 'allow',
			risk: 'medium',
			effect: 'external',
			schema: { type: 'object' },
			execute: () => 'sent',
		});
		const events = runToolCall(
			external,
			{ id: 'private-egress', name: external.name, args: {} },
			true,
			undefined,
			context,
			'bypass'
		);
		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		expect((await events.next()).value).toMatchObject({
			type: 'tool_permission_request',
			hardApproval: true,
		});
	});
});

function fakeTool(name: string, run: jest.Mock): Tool {
	return jsonTool({
		name,
		description: name,
		effect: 'read',
		schema: { type: 'object' },
		execute: run,
	});
}
