import { calculateJwkThumbprint, importJWK, type JWK } from 'jose';

export async function normalizePublicKey(value: unknown): Promise<{
	key: JWK;
	thumbprint: string;
}> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('publicKeyJwk must be an Ed25519 public JWK.');
	}
	const candidate = value as Record<string, unknown>;
	if (
		candidate.kty !== 'OKP' ||
		candidate.crv !== 'Ed25519' ||
		typeof candidate.x !== 'string' ||
		Buffer.from(candidate.x, 'base64url').length !== 32 ||
		'd' in candidate ||
		(candidate.alg !== undefined && candidate.alg !== 'EdDSA') ||
		(candidate.use !== undefined && candidate.use !== 'sig')
	) {
		throw new Error('publicKeyJwk must be an Ed25519 public JWK.');
	}
	const key: JWK = {
		kty: 'OKP',
		crv: 'Ed25519',
		x: candidate.x,
		alg: 'EdDSA',
		use: 'sig',
	};
	await importJWK(key, 'EdDSA');
	return { key, thumbprint: await calculateJwkThumbprint(key, 'sha256') };
}
