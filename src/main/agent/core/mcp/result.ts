export function mcpResult(result: Record<string, unknown>): unknown {
	if (result.isError === true) {
		const content = Array.isArray(result.content) ? result.content : [];
		const message = content
			.filter((item): item is { type: 'text'; text: string } =>
				Boolean(item && typeof item === 'object' && 'type' in item && item.type === 'text' && 'text' in item && typeof item.text === 'string')
			)
			.map((item) => item.text)
			.join('\n');
		throw new Error(message || 'MCP tool call failed.');
	}
	if (result.structuredContent !== undefined) return result.structuredContent;
	return result.content ?? result;
}
