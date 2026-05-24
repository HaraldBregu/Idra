import { ipcRenderer } from 'electron';

import { chatMemory, rag, wiki } from '../../../../src/preload';
import {
	ChatMemoryChannels,
	RagChannels,
	WikiChannels,
} from '../../../../src/shared/ipc-channels';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

describe('memory preload APIs', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
	});

	it('routes chat memory, RAG, and wiki APIs to their own IPC channels', async () => {
		mockedIpcRenderer.invoke
			.mockResolvedValueOnce({ success: true, data: [] })
			.mockResolvedValueOnce({ success: true, data: [] })
			.mockResolvedValueOnce({
				success: true,
				data: { path: 'memory/chats/chat-a/2026-05-24.md', from: 1, lines: 1, text: '', truncated: false, maxChars: 16000, lineCount: 1 },
			})
			.mockResolvedValueOnce({ success: true, data: [] })
			.mockResolvedValueOnce({ success: true, data: [] })
			.mockResolvedValueOnce({
				success: true,
				data: { path: 'memory/rag/source.md', from: 1, lines: 1, text: '', truncated: false, maxChars: 16000, lineCount: 1 },
			})
			.mockResolvedValueOnce({ success: true, data: [] })
			.mockResolvedValueOnce({ success: true, data: [] })
			.mockResolvedValueOnce({
				success: true,
				data: { path: 'memory/wiki/index.md', from: 1, lines: 1, text: '', truncated: false, maxChars: 16000, lineCount: 1 },
			});

		await chatMemory.list({ scopeId: 'chat-a' });
		await chatMemory.search({ query: 'Alpha', scopeId: 'chat-a' });
		await chatMemory.read({ path: 'memory/chats/chat-a/2026-05-24.md' });
		await rag.list();
		await rag.search({ query: 'source' });
		await rag.read({ path: 'memory/rag/source.md' });
		await wiki.list();
		await wiki.search({ query: 'knowledge' });
		await wiki.read({ path: 'memory/wiki/index.md' });

		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(1, ChatMemoryChannels.list, {
			scopeId: 'chat-a',
		});
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(2, ChatMemoryChannels.search, {
			query: 'Alpha',
			scopeId: 'chat-a',
		});
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(3, ChatMemoryChannels.read, {
			path: 'memory/chats/chat-a/2026-05-24.md',
		});
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(4, RagChannels.list);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(5, RagChannels.search, {
			query: 'source',
		});
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(6, RagChannels.read, {
			path: 'memory/rag/source.md',
		});
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(7, WikiChannels.list);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(8, WikiChannels.search, {
			query: 'knowledge',
		});
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(9, WikiChannels.read, {
			path: 'memory/wiki/index.md',
		});
	});
});
