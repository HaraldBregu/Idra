import { LlmContextOverflowError } from '../../../../../src/main/models/adapters/llm';
import { runModelTurn } from '../../../../../src/main/agent/run/run_model_turn';
import type { ModelTurnStream } from '../../../../../src/main/agent/run/run_model_turn';
import type { ResolvedProvider } from '../../../../../src/shared/provider_types';

describe('runModelTurn', () => {
	it('does not retry an unchanged request after context overflow', async () => {
		const error = new LlmContextOverflowError('context too long');
		const stream = jest.fn(() => ({
			[Symbol.asyncIterator]: () => ({
				next: () => Promise.reject(error),
			}),
		}));
		const events = runModelTurn(
			{ task: 'chat', message: 'hello' },
			{ id: 'test', apiKey: 'key' } as ResolvedProvider,
			'model',
			'system',
			[{ role: 'user', content: 'hello' }],
			[],
			new AbortController().signal,
			{},
			{ stream } as ModelTurnStream
		);

		await expect(events.next()).rejects.toBe(error);
		expect(stream).toHaveBeenCalledTimes(1);
	});
});
