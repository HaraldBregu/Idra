export async function readSource(file: File): Promise<string> {
	const source = await file.text();
	if (file.type !== 'text/markdown' && !/\.md$/i.test(file.name)) return source;
	const fence = source.match(/```(?:mermaid|mmd)\s*\r?\n([\s\S]*?)```/i);
	return fence?.[1].trim() ?? source;
}
