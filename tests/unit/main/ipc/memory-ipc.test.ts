import { ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { EventBus } from '../../../../src/main/core/event-bus';
import { ChatMemoryIpc } from '../../../../src/main/ipc/chat-memory-ipc';
import { RagIpc } from '../../../../src/main/ipc/rag-ipc';
import { WikiIpc } from '../../../../src/main/ipc/wiki-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import {
	ChatMemoryChannels,
	RagChannels,
	WikiChannels,
} from '../../../../src/shared/ipc-channels';
import { makeTempDir } from '../test-helpers';

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

async function writeWorkspaceFile(workspace: string, relativePath: string, content: string): Promise<void> {
	const target = path.join(workspace, relativePath);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, content, 'utf8');
}

function createContainer(workspace: string): MainServiceContainer {
	return {
		get: jest.fn((key: string) => {
			if (key !== 'workspace') throw new Error(`Unexpected service lookup: ${key}`);
			return {
				getRootPath: () => workspace,
			};
		}),
	} as unknown as MainServiceContainer;
}

describe('memory group IPC', () => {
	let workspace: string;

	beforeEach(async () => {
		jest.clearAllMocks();
		workspace = await makeTempDir();
		await writeWorkspaceFile(
			workspace,
			path.join('memory', 'chats', 'chat-a', '2026-05-24.md'),
			'Alpha decision lives in chat memory.'
		);
		await writeWorkspaceFile(workspace, path.join('memory', 'rag', 'source.md'), 'Imported Alpha source material.');
		await writeWorkspaceFile(workspace, path.join('memory', 'wiki', 'index.md'), 'Workspace wiki knowledge.');
	});

	afterEach(async () => {
		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('registers separate list, read, and search handlers for chat memory, RAG, and wiki', async () => {
		const container = createContainer(workspace);
		const eventBus = new EventBus();

		new ChatMemoryIpc().register(container, eventBus);
		new RagIpc().register(container, eventBus);
		new WikiIpc().register(container, eventBus);

		await expect(registeredHandler(ChatMemoryChannels.list)({}, { scopeId: 'chat-a' })).resolves.toMatchObject({
			success: true,
			data: [
				expect.objectContaining({
					relativePath: path.join('memory', 'chats', 'chat-a', '2026-05-24.md'),
					corpus: 'memory',
					scopeKind: 'chat',
					scopeId: 'chat-a',
				}),
			],
		});
		await expect(
			registeredHandler(ChatMemoryChannels.search)({}, { query: 'Alpha', scopeId: 'chat-a' })
		).resolves.toMatchObject({
			success: true,
			data: [
				expect.objectContaining({
					corpus: 'memory',
					scopeKind: 'chat',
					scopeId: 'chat-a',
					text: expect.stringContaining('Alpha decision'),
				}),
			],
		});
		await expect(
			registeredHandler(ChatMemoryChannels.read)(
				{},
				{ path: path.join('memory', 'chats', 'chat-a', '2026-05-24.md'), lines: 1 }
			)
		).resolves.toMatchObject({
			success: true,
			data: expect.objectContaining({
				text: expect.stringContaining('Alpha decision'),
			}),
		});

		await expect(registeredHandler(RagChannels.list)({})).resolves.toMatchObject({
			success: true,
			data: [
				expect.objectContaining({
					relativePath: path.join('memory', 'rag', 'source.md'),
					corpus: 'rag',
					scopeId: 'rag',
				}),
			],
		});
		await expect(registeredHandler(RagChannels.search)({}, { query: 'source' })).resolves.toMatchObject({
			success: true,
			data: [expect.objectContaining({ corpus: 'rag', text: expect.stringContaining('source material') })],
		});
		await expect(
			registeredHandler(RagChannels.read)({}, { path: path.join('memory', 'rag', 'source.md') })
		).resolves.toMatchObject({
			success: true,
			data: expect.objectContaining({ text: expect.stringContaining('Imported Alpha source') }),
		});

		await expect(registeredHandler(WikiChannels.list)({})).resolves.toMatchObject({
			success: true,
			data: [
				expect.objectContaining({
					relativePath: path.join('memory', 'wiki', 'index.md'),
					corpus: 'wiki',
					scopeId: 'wiki',
				}),
			],
		});
		await expect(registeredHandler(WikiChannels.search)({}, { query: 'knowledge' })).resolves.toMatchObject({
			success: true,
			data: [expect.objectContaining({ corpus: 'wiki', text: expect.stringContaining('wiki knowledge') })],
		});
		await expect(
			registeredHandler(WikiChannels.read)({}, { path: path.join('memory', 'wiki', 'index.md') })
		).resolves.toMatchObject({
			success: true,
			data: expect.objectContaining({ text: expect.stringContaining('Workspace wiki') }),
		});
	});

	it('keeps each read API inside its own memory root', async () => {
		const container = createContainer(workspace);
		new ChatMemoryIpc().register(container, new EventBus());

		await expect(
			registeredHandler(ChatMemoryChannels.read)({}, { path: path.join('memory', 'rag', 'source.md') })
		).resolves.toMatchObject({
			success: false,
			error: { message: 'Memory path is outside chat memory root.' },
		});
	});
});
