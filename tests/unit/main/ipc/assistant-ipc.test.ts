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
				status: 'error',
				output: [
					{ type: 'text', text: 'failed' },
					{ type: 'image', mimeType: 'image/png', base64: '[base64 image]' },
				],
				content: 'failed\n[binary]',
			},
		]);
	});

	it('preserves rejected tool result status for restored renderer state', () => {
		const transcript: TranscriptEntry[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_use',
						toolUseId: 'tool-denied',
						toolName: 'exec',
						toolArgs: { command: 'rm -rf /tmp/example' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-denied',
				isError: true,
				status: 'rejected',
				content: [{ type: 'text', text: 'User denied approval for exec.' }],
			},
		];

		expect(transcriptToHistory(transcript)[1]).toEqual({
			role: 'tool',
			toolUseId: 'tool-denied',
			isError: true,
			status: 'rejected',
			output: 'User denied approval for exec.',
			content: 'User denied approval for exec.',
		});
	});
});
