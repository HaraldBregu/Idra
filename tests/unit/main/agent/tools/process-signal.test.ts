import { EventEmitter } from 'node:events';

const spawn = jest.fn();

jest.mock('node:child_process', () => ({ spawn }));

import { execTool } from '../../../../../src/main/agent/tools/run_exec';
import {
	processTool,
	registry,
	type ProcessSession,
} from '../../../../../src/main/agent/tools/run_process';

function childProcess() {
	const child = new EventEmitter() as EventEmitter & {
		pid: number;
		stdout: EventEmitter;
		stderr: EventEmitter;
		stdin: { write: jest.Mock };
		kill: jest.Mock;
		unref: jest.Mock;
	};
	child.pid = 42;
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.stdin = { write: jest.fn() };
	child.unref = jest.fn();
	child.kill = jest.fn(() => {
		queueMicrotask(() => child.emit('close', null, 'SIGTERM'));
		return true;
	});
	return child;
}

it('kills only the exec child when its run is cancelled', async () => {
	const child = childProcess();
	const unrelated = childProcess();
	spawn.mockReturnValue(child);
	registry.register({
		id: 'unrelated',
		pid: unrelated.pid,
		command: 'other',
		workdir: '/tmp',
		startedAt: Date.now(),
		stdout: '',
		stderr: '',
		exitCode: undefined,
		exitSignal: undefined,
		exited: false,
		child: unrelated as never,
	});
	const controller = new AbortController();
	const result = execTool.run(
		{ command: 'long command', workdir: '/tmp', yieldMs: 10_000 },
		controller.signal
	);
	const reason = new Error('cancel exec');
	controller.abort(reason);

	await expect(result).rejects.toBe(reason);
	expect(child.kill).toHaveBeenCalledWith('SIGTERM');
	expect(unrelated.kill).not.toHaveBeenCalled();
	expect(registry.get('unrelated')).toBeDefined();
	registry.remove('unrelated');
});

it('kills a background exec cancelled before its spawn acknowledgement', async () => {
	const child = childProcess();
	spawn.mockReturnValue(child);
	const controller = new AbortController();
	const result = execTool.run(
		{ command: 'background command', workdir: '/tmp', background: true },
		controller.signal
	);
	const reason = new Error('cancel background exec');
	controller.abort(reason);

	await expect(result).rejects.toBe(reason);
	expect(child.kill).toHaveBeenCalledWith('SIGTERM');
});

it('cancels a process poll without killing or removing its existing session', async () => {
	const child = childProcess();
	const session: ProcessSession = {
		id: 'existing',
		pid: child.pid,
		command: 'existing command',
		workdir: '/tmp',
		startedAt: Date.now(),
		stdout: '',
		stderr: '',
		exitCode: undefined,
		exitSignal: undefined,
		exited: false,
		child: child as never,
	};
	registry.register(session);
	const controller = new AbortController();
	const result = processTool.run(
		{ action: 'poll', sessionId: session.id, timeout: 30_000 },
		controller.signal
	);
	const reason = new Error('cancel poll');
	controller.abort(reason);

	await expect(result).rejects.toBe(reason);
	expect(child.kill).not.toHaveBeenCalled();
	expect(registry.get(session.id)).toBe(session);
	registry.remove(session.id);
});
