import { chunkText } from '../../../../src/main/rag/rag_chunk';

describe('chunkText', () => {
	it('keeps paragraphs together when they fit in a chunk', () => {
		expect(chunkText('# Title\n\nFirst paragraph.\n\nSecond paragraph.')).toEqual([
			'# Title\n\nFirst paragraph.\n\nSecond paragraph.',
		]);
	});

	it('splits oversized content into bounded, overlapping chunks', () => {
		const chunks = chunkText('word '.repeat(1_000));

		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks.every((chunk) => chunk.length <= 2_000)).toBe(true);
		expect(chunks[1]).toContain(chunks[0].slice(-100));
	});
});
