import type { OAuthIssuer } from '../oauth/issuer';
import type { ConfigurationStore } from './store';
import type { ConfigurationResponse } from './types';

export function configurationResponse(
	store: ConfigurationStore,
	issuer: OAuthIssuer
): ConfigurationResponse {
	return {
		...store.publicConfiguration(),
		oauth: {
			issuer: issuer.issuer,
			resource: issuer.resource,
			scope: issuer.scope,
			tokenEndpoint: issuer.tokenEndpoint,
			tokenEndpointAuthMethod: 'private_key_jwt',
		},
	};
}
