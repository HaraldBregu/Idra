interface ErrorMetadata {
	httpStatusCode?: number;
	requestId?: string;
	extendedRequestId?: string;
	cfId?: string;
}

function describeOne(error: unknown): string {
	if (!(error instanceof Error)) return String(error);

	const parts: string[] = [];
	const code = (error as NodeJS.ErrnoException).code;
	const label = code || (error.name !== 'Error' ? error.name : undefined);
	parts.push(label ? `${label}: ${error.message}` : error.message);

	const metadata = (error as { $metadata?: ErrorMetadata }).$metadata;
	if (metadata?.httpStatusCode) parts.push(`HTTP ${metadata.httpStatusCode}`);
	if (metadata?.requestId) parts.push(`requestId: ${metadata.requestId}`);
	if (metadata?.extendedRequestId) parts.push(`extendedRequestId: ${metadata.extendedRequestId}`);
	if (metadata?.cfId) parts.push(`cfId: ${metadata.cfId}`);

	return parts.join(', ');
}

export function describeStorageError(error: unknown): string {
	const chain: string[] = [describeOne(error)];

	let cause = error instanceof Error ? error.cause : undefined;
	while (cause) {
		chain.push(describeOne(cause));
		cause = cause instanceof Error ? cause.cause : undefined;
	}

	return chain.join(' — caused by: ');
}
