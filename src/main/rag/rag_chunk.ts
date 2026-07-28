const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

export function chunkText(text: string): string[] {
	const chunks: string[] = [];
	for (let start = 0; start < text.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
		const chunk = text.slice(start, start + CHUNK_SIZE).trim();
		if (chunk) chunks.push(chunk);
	}
	return chunks;
}
