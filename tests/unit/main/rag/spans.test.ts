import { chunkSpans } from '../../../../src/main/rag/spans';

it('keeps source-relative line ranges for citation metadata', () => {
	expect(chunkSpans('Heading\r\n\r\nFirst detail\r\nSecond detail')).toEqual([
		{
			text: 'Heading\n\nFirst detail\nSecond detail',
			lineStart: 1,
			lineEnd: 4,
		},
	]);
});
