import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
	OAuthClientInformationMixed,
	OAuthClientMetadata,
	OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { resolveConnectorSettingsLocation } from './store';

type OAuthStore = {
	clientInformation?: OAuthClientInformationMixed;
	tokens?: OAuthTokens;
	codeVerifier?: string;
};

const REDIRECT_URL = 'http://127.0.0.1:8989/oauth/callback';

function clientMetadata(hasSecret: boolean): OAuthClientMetadata {
	return {
		client_name: 'Friday',
		redirect_uris: [REDIRECT_URL],
		grant_types: ['authorization_code', 'refresh_token'],
		response_types: ['code'],
		token_endpoint_auth_method: hasSecret ? 'client_secret_post' : 'none',
	};
}

function storePath(serverName: string, serverUrl: string): string {
	const safe = serverName.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
	const key = createHash('sha256').update(serverName).update('\0').update(serverUrl).digest('hex');
	return path.join(resolveConnectorSettingsLocation(), 'oauth', `${safe}-${key.slice(0, 16)}.json`);
}

async function read(file: string): Promise<OAuthStore> {
	try {
		return JSON.parse(await fs.readFile(file, 'utf-8')) as OAuthStore;
	} catch {
		return {};
	}
}

async function write(file: string, store: OAuthStore): Promise<void> {
	await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
	await fs.writeFile(file, JSON.stringify(store, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function createOAuthProvider(params: {
	serverName: string;
	serverUrl: string;
	onRedirect?: (url: URL) => void;
}): OAuthClientProvider {
	const file = storePath(params.serverName, params.serverUrl);
	return {
		get redirectUrl() {
			return REDIRECT_URL;
		},
		get clientMetadata() {
			return CLIENT_METADATA;
		},
		async clientInformation() {
			return (await read(file)).clientInformation;
		},
		async saveClientInformation(clientInformation) {
			await write(file, { ...(await read(file)), clientInformation });
		},
		async tokens() {
			return (await read(file)).tokens;
		},
		async saveTokens(tokens) {
			await write(file, { ...(await read(file)), tokens });
		},
		async redirectToAuthorization(url) {
			params.onRedirect?.(url);
		},
		async saveCodeVerifier(codeVerifier) {
			await write(file, { ...(await read(file)), codeVerifier });
		},
		async codeVerifier() {
			const verifier = (await read(file)).codeVerifier;
			if (!verifier) throw new Error('Missing OAuth code verifier. Start the login flow again.');
			return verifier;
		},
		async invalidateCredentials(scope) {
			const next: OAuthStore = { ...(await read(file)) };
			if (scope === 'all' || scope === 'client') delete next.clientInformation;
			if (scope === 'all' || scope === 'tokens') delete next.tokens;
			if (scope === 'all' || scope === 'verifier') delete next.codeVerifier;
			await write(file, next);
		},
	};
}
