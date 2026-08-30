import type { JWK } from 'jose';
import type { ProviderConfiguration } from '../provider/types';

export interface SealedValue {
	iv: string;
	tag: string;
	value: string;
}

export interface StoredClient {
	clientId: string;
	createdAt: string;
	keyThumbprint: string;
	name: string;
	publicKey: JWK;
}

export interface StoredConfiguration {
	clients: StoredClient[];
	provider?: SealedValue;
	signingPrivateKey: SealedValue;
	signingPublicKey: JWK;
	version: 1;
}

export interface PublicConfiguration {
	clients: Array<Omit<StoredClient, 'publicKey'>>;
	provider: {
		configured: boolean;
		hasApiKey: boolean;
		model: string | null;
		provider: ProviderConfiguration['provider'] | null;
	};
}
