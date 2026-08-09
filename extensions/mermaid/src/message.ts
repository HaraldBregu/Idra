export function errorMessage(error: unknown): string {
	if (!(error instanceof Error)) return 'Unable to render this diagram.';
	return error.message.replace(/^Error:\s*/i, '').trim() || 'Unable to render this diagram.';
}
