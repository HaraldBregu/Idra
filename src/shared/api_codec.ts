const CHUNK = 0x8000;

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let index = 0; index < bytes.length; index += CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
	}
	return btoa(binary);
}

function toBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
	return bytes;
}

/** Tag byte arrays so they survive JSON transport between the app and the SDK. */
export function encode(value: unknown): unknown {
	if (value instanceof Uint8Array) return { $bytes: toBase64(value) };
	if (Array.isArray(value)) return value.map(encode);
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
	}
	return value;
}

/** Restore byte arrays tagged by {@link encode}. */
export function decode(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(decode);
	if (value && typeof value === 'object') {
		const bytes = (value as { $bytes?: unknown }).$bytes;
		if (typeof bytes === 'string') return toBytes(bytes);
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
	}
	return value;
}
