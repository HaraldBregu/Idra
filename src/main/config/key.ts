export function decodeConfigurationKey(value: string): Buffer {
	const key = /^[0-9a-f]{64}$/i.test(value)
		? Buffer.from(value, 'hex')
		: Buffer.from(value, 'base64url');
	if (key.length !== 32) {
		throw new Error('IDRA_CONFIG_KEY must encode exactly 32 random bytes.');
	}
	return key;
}
