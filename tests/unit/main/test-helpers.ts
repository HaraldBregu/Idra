import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import type { ToolContext } from '../../../src/main/tools/types';

export async function makeTempDir(prefix = 'friday-main-test-'): Promise<string> {
	return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export function makeLogger() {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};
}

export function makeToolContext(overrides: Partial<ToolContext> = {}): ToolContext {
	const workspace = overrides.workspace ?? os.tmpdir();
	return {
		workspace,
		sessionId: 'test-session',
		readState: new Map(),
		plan: { entries: [] },
		approvalRequired: new Set(),
		approvalCache: new Set(),
		services: {
			store: {} as ToolContext['services']['store'],
			cron: {} as ToolContext['services']['cron'],
			eventBus: { emit: jest.fn(), broadcast: jest.fn(), on: jest.fn(), off: jest.fn(), sendTo: jest.fn(), clearAllListeners: jest.fn() } as unknown as ToolContext['services']['eventBus'],
			logger: makeLogger() as unknown as ToolContext['services']['logger'],
			userDataDirectory: {
				getRootPath: jest.fn(() => workspace),
				ensureRoot: jest.fn(async () => workspace),
				resolve: jest.fn((...segments: string[]) => path.resolve(workspace, ...segments)),
				resolveExisting: jest.fn(async (...segments: string[]) => path.resolve(workspace, ...segments)),
			} as unknown as ToolContext['services']['userDataDirectory'],
				workspace: {
					getRootPath: jest.fn(() => workspace),
					resolvePath: jest.fn((...segments: string[]) => path.resolve(workspace, ...segments)),
					ensureReady: jest.fn(async () => undefined),
				} as unknown as ToolContext['services']['workspace'],
				startupFiles: {
					getRootPath: jest.fn(() => path.resolve(workspace, 'agent', 'workspaces', 'main')),
					ensureReady: jest.fn(async () => undefined),
					isBootstrapPending: jest.fn(async () => false),
					loadContextFiles: jest.fn(async () => []),
					listFiles: jest.fn(async () => []),
					readFile: jest.fn(),
					writeFile: jest.fn(),
					completeBootstrap: jest.fn(),
				} as unknown as ToolContext['services']['startupFiles'],
			},
			...overrides,
		};
	}

export async function collectAsync<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const item of iterable) out.push(item);
	return out;
}
