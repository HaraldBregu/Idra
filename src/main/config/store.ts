import { generateKeyPairSync, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { importJWK, type JWK } from 'jose';
import { PROVIDERS, type ProviderConfiguration, type ProviderId } from '../provider/types';
import { seal } from './seal';
import type { PublicConfiguration, SealedValue, StoredClient, StoredConfiguration } from './types';
import { unseal } from './unseal';

const FILE_NAME = 'secure-config.json';

export class ConfigurationStore {
	private document: StoredConfiguration;
	private readonly filePath: string;

	constructor(
		private readonly directory: string,
		private readonly encryptionKey: Buffer
	) {
		this.filePath = path.join(path.resolve(directory), FILE_NAME);
		fs.mkdirSync(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
		fs.chmodSync(path.dirname(this.filePath), 0o700);
		if (fs.existsSync(this.filePath)) {
			if (fs.lstatSync(this.filePath).isSymbolicLink()) {
				throw new Error('The secure configuration cannot be a symbolic link.');
			}
			this.document = this.parse(JSON.parse(fs.readFileSync(this.filePath, 'utf8')));
			return;
		}

		const pair = generateKeyPairSync('ed25519');
		const keyId = randomUUID();
		const publicKey = pair.publicKey.export({ format: 'jwk' }) as JWK;
		const privateKey = pair.privateKey.export({ format: 'jwk' }) as JWK;
		this.document = {
			version: 1,
			clients: [],
			signingPublicKey: { ...publicKey, alg: 'EdDSA', use: 'sig', kid: keyId },
			signingPrivateKey: seal(
				{ ...privateKey, alg: 'EdDSA', use: 'sig', kid: keyId },
				this.encryptionKey,
				'signing-key'
			),
		};
		this.write();
	}

	publicConfiguration(): PublicConfiguration {
		const provider = this.provider();
		return {
			clients: this.document.clients.map(({ publicKey: _publicKey, ...client }) => ({ ...client })),
			provider: provider
				? {
						configured: true,
						hasApiKey: true,
						provider: provider.provider,
						model: provider.model,
					}
				: { configured: false, hasApiKey: false, provider: null, model: null },
		};
	}

	provider(): ProviderConfiguration | undefined {
		if (!this.document.provider) return undefined;
		const value = unseal(this.document.provider, this.encryptionKey, 'provider');
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			throw new Error('The encrypted provider configuration is invalid.');
		}
		const provider = value as Partial<ProviderConfiguration>;
		if (
			!PROVIDERS.includes(provider.provider as ProviderId) ||
			typeof provider.model !== 'string' ||
			!provider.model.trim() ||
			typeof provider.apiKey !== 'string' ||
			!provider.apiKey.trim()
		) {
			throw new Error('The encrypted provider configuration is invalid.');
		}
		return {
			provider: provider.provider as ProviderId,
			model: provider.model.trim(),
			apiKey: provider.apiKey.trim(),
		};
	}

	setProvider(provider: ProviderConfiguration): void {
		this.document.provider = seal(provider, this.encryptionKey, 'provider');
		this.write();
	}

	deleteProvider(): boolean {
		if (!this.document.provider) return false;
		delete this.document.provider;
		this.write();
		return true;
	}

	clients(): StoredClient[] {
		return structuredClone(this.document.clients);
	}

	client(clientId: string): StoredClient | undefined {
		const client = this.document.clients.find((value) => value.clientId === clientId);
		return client ? structuredClone(client) : undefined;
	}

	addClient(name: string, publicKey: JWK, keyThumbprint: string): StoredClient {
		const client: StoredClient = {
			clientId: randomUUID(),
			createdAt: new Date().toISOString(),
			keyThumbprint,
			name,
			publicKey,
		};
		this.document.clients.push(client);
		this.write();
		return structuredClone(client);
	}

	deleteClient(clientId: string): boolean {
		const remaining = this.document.clients.filter((client) => client.clientId !== clientId);
		if (remaining.length === this.document.clients.length) return false;
		this.document.clients = remaining;
		this.write();
		return true;
	}

	publicSigningKey(): JWK {
		return structuredClone(this.document.signingPublicKey);
	}

	async privateSigningKey(): Promise<Awaited<ReturnType<typeof importJWK>>> {
		const value = unseal(this.document.signingPrivateKey, this.encryptionKey, 'signing-key');
		return importJWK(value as JWK, 'EdDSA');
	}

	private parse(value: unknown): StoredConfiguration {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			throw new Error('The secure configuration is invalid.');
		}
		const document = value as Partial<StoredConfiguration>;
		if (
			document.version !== 1 ||
			!Array.isArray(document.clients) ||
			!this.sealed(document.signingPrivateKey) ||
			!document.signingPublicKey ||
			typeof document.signingPublicKey !== 'object' ||
			(document.provider !== undefined && !this.sealed(document.provider)) ||
			document.clients.some(
				(client) =>
					!client ||
					typeof client.clientId !== 'string' ||
					typeof client.createdAt !== 'string' ||
					typeof client.keyThumbprint !== 'string' ||
					typeof client.name !== 'string' ||
					!client.publicKey ||
					typeof client.publicKey !== 'object'
			)
		) {
			throw new Error('The secure configuration is invalid.');
		}
		return structuredClone(document as StoredConfiguration);
	}

	private sealed(value: unknown): value is SealedValue {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
		const sealed = value as Partial<SealedValue>;
		return (
			typeof sealed.iv === 'string' &&
			typeof sealed.tag === 'string' &&
			typeof sealed.value === 'string'
		);
	}

	private write(): void {
		const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
		try {
			fs.writeFileSync(temporaryPath, `${JSON.stringify(this.document, null, 2)}\n`, {
				encoding: 'utf8',
				flag: 'wx',
				mode: 0o600,
			});
			fs.renameSync(temporaryPath, this.filePath);
			fs.chmodSync(this.filePath, 0o600);
		} finally {
			fs.rmSync(temporaryPath, { force: true });
		}
	}
}
