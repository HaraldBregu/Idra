import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { McpOAuthState } from './mcp-store';

export type McpOAuthStorage = {
	load: () => McpOAuthState;
	save: (state: McpOAuthState) => void;
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

export function createOAuthProvider(params: {
	storage: McpOAuthStorage;
	clientId?: string;
	clientSecret?: string;
	onRedirect?: (url: URL) => void;
}): OAuthClientProvider {
	const { storage } = params;
	const staticClient = params.clientId
		? { client_id: params.clientId, client_secret: params.clientSecret }
		: undefined;
	return {
		get redirectUrl() {
			return REDIRECT_URL;
		},
		get clientMetadata() {
			return clientMetadata(Boolean(params.clientSecret));
		},
		clientInformation() {
			return staticClient ?? storage.load().clientInformation;
		},
		saveClientInformation(clientInformation) {
			storage.save({ ...storage.load(), clientInformation });
		},
		tokens() {
			return storage.load().tokens;
		},
		saveTokens(tokens) {
			storage.save({ ...storage.load(), tokens });
		},
		redirectToAuthorization(url) {
			params.onRedirect?.(url);
		},
		saveCodeVerifier(codeVerifier) {
			storage.save({ ...storage.load(), codeVerifier });
		},
		codeVerifier() {
			const verifier = storage.load().codeVerifier;
			if (!verifier) throw new Error('Missing OAuth code verifier. Start the login flow again.');
			return verifier;
		},
		invalidateCredentials(scope) {
			const next: McpOAuthState = { ...storage.load() };
			if (scope === 'all' || scope === 'client') delete next.clientInformation;
			if (scope === 'all' || scope === 'tokens') delete next.tokens;
			if (scope === 'all' || scope === 'verifier') delete next.codeVerifier;
			storage.save(next);
		},
	};
}
