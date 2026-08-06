export function normalizeEndpoint(endpoint: string, bucket: string): string {
	const normalized = endpoint.replace(/\/+$/, '');
	const bucketSuffix = `/${bucket}`;
	return bucket && normalized.endsWith(bucketSuffix)
		? normalized.slice(0, -bucketSuffix.length)
		: normalized;
}
