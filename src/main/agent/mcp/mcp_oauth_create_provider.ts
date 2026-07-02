import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { McpOAuthProviderParams, McpOAuthState } from './mcp_types';
import { clientMetadata, MCP_OAUTH_REDIRECT_URL } from './mcp_oauth_client_metadata';

export function createOAuthProvider(params: McpOAuthProviderParams): OAuthClientProvider {
	const { storage } = params;
	const staticClient = params.clientId
		? { client_id: params.clientId, client_secret: params.clientSecret }
		: undefined;
	return {
		get redirectUrl() {
			return MCP_OAUTH_REDIRECT_URL;
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
