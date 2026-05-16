import { transcriptToHistory } from '../../../../src/main/ipc/assistant-ipc';
import type { TranscriptEntry } from '../../../../src/main/provider/types';

describe('assistant/ipc history conversion', () => {
	it('preserves assistant content blocks and tool result metadata for renderer history', () => {
		const transcript: TranscriptEntry[] = [
			{ role: 'user', content: 'read it' },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Reading.' },
					{
						type: 'tool_use',
						toolUseId: 'tool-1',
						toolName: 'read_file',
						toolArgs: { path: 'README.md' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-1',
				isError: true,
				content: [
					{ type: 'text', text: 'failed' },
					{ type: 'image', mimeType: 'image/png', base64: 'abc' },
				],
			},
		];

		expect(transcriptToHistory(transcript)).toEqual([
			{ role: 'user', content: 'read it' },
			{
				role: 'assistant',
				content: 'Reading.',
				contentBlocks: [
					{ type: 'text', text: 'Reading.' },
					{
						type: 'tool_use',
						toolUseId: 'tool-1',
						toolName: 'read_file',
						toolArgs: { path: 'README.md' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-1',
				isError: true,
				content: 'failed\n[binary]',
			},
		]);
	});
});
