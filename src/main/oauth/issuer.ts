import { randomUUID } from 'node:crypto';
import { importJWK, jwtVerify, SignJWT } from 'jose';
import type { ConfigurationStore } from '../config/store';
import { OAuthError } from './error';

const ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const ACCESS_TOKEN_SECONDS = 300;

export interface OAuthPrincipal {
	clientId: string;
	scope: string;
}

export interface TokenResponse {
	access_token: string;
	expires_in: number;
	scope: string;
	token_type: 'Bearer';
}

export class OAuthIssuer {
	readonly issuer: string;
	readonly metadataUrl: string;
	readonly protectedResourceUrl: string;
	readonly resource: string;
	readonly scope = 'a2a.invoke';
	readonly tokenEndpoint: string;
	private readonly usedAssertions = new Map<string, number>();

	constructor(
		readonly store: ConfigurationStore,
		publicUrl: string
	) {
		this.issuer = publicUrl;
		this.resource = `${publicUrl}/a2a`;
		this.tokenEndpoint = `${publicUrl}/a2a/oauth/token`;
		this.metadataUrl = `${publicUrl}/.well-known/oauth-authorization-server`;
		this.protectedResourceUrl = `${publicUrl}/.well-known/oauth-protected-resource/a2a`;
	}

	async issue(body: Record<string, string>): Promise<TokenResponse> {
		if (
			body.grant_type !== 'client_credentials' ||
			body.client_assertion_type !== ASSERTION_TYPE ||
			!body.client_id ||
			!body.client_assertion ||
			(body.resource !== undefined && body.resource !== this.resource)
		) {
			throw new OAuthError(400, 'invalid_request', 'A valid client credentials request is required.');
		}
		if (body.scope !== this.scope) {
			throw new OAuthError(400, 'invalid_scope', `The only supported scope is ${this.scope}.`);
		}
		const client = this.store.client(body.client_id);
		if (!client) throw new OAuthError(401, 'invalid_client', 'Client authentication failed.');

		try {
			const key = await importJWK(client.publicKey, 'EdDSA');
			const { payload } = await jwtVerify(body.client_assertion, key, {
				algorithms: ['EdDSA'],
				audience: this.tokenEndpoint,
				clockTolerance: 5,
				issuer: client.clientId,
				maxTokenAge: '5 minutes',
				requiredClaims: ['iat', 'exp', 'jti', 'sub'],
				subject: client.clientId,
			});
			if (
				typeof payload.iat !== 'number' ||
				typeof payload.exp !== 'number' ||
				payload.exp - payload.iat > 300 ||
				typeof payload.jti !== 'string' ||
				payload.jti.length === 0 ||
				payload.jti.length > 200
			) {
				throw new Error('Invalid assertion claims.');
			}
			const replayKey = `${client.clientId}:${payload.jti}`;
			const now = Math.floor(Date.now() / 1000);
			if (payload.iat > now + 5) throw new Error('Assertion issued in the future.');
			for (const [key, expiry] of this.usedAssertions) {
				if (expiry < now) this.usedAssertions.delete(key);
			}
			if (this.usedAssertions.has(replayKey)) {
				throw new OAuthError(400, 'invalid_grant', 'The client assertion was already used.');
			}
			this.usedAssertions.set(replayKey, payload.exp);
		} catch (error) {
			if (error instanceof OAuthError) throw error;
			throw new OAuthError(401, 'invalid_client', 'Client authentication failed.');
		}

		const now = Math.floor(Date.now() / 1000);
		const accessToken = await new SignJWT({
			client_id: client.clientId,
			scope: this.scope,
		})
			.setProtectedHeader({
				alg: 'EdDSA',
				typ: 'at+jwt',
				kid: this.store.publicSigningKey().kid,
			})
			.setIssuer(this.issuer)
			.setAudience(this.resource)
			.setSubject(client.clientId)
			.setIssuedAt(now)
			.setExpirationTime(now + ACCESS_TOKEN_SECONDS)
			.setJti(randomUUID())
			.sign(await this.store.privateSigningKey());
		return {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: ACCESS_TOKEN_SECONDS,
			scope: this.scope,
		};
	}

	async authenticate(token: string): Promise<OAuthPrincipal> {
		const key = await importJWK(this.store.publicSigningKey(), 'EdDSA');
		const { payload } = await jwtVerify(token, key, {
			algorithms: ['EdDSA'],
			audience: this.resource,
			clockTolerance: 5,
			issuer: this.issuer,
			maxTokenAge: `${ACCESS_TOKEN_SECONDS} seconds`,
			requiredClaims: ['iat', 'exp', 'jti', 'sub', 'client_id', 'scope'],
			typ: 'at+jwt',
		});
		if (
			typeof payload.sub !== 'string' ||
			payload.client_id !== payload.sub ||
			payload.scope !== this.scope ||
			!this.store.client(payload.sub)
		) {
			throw new Error('Access token is not authorized.');
		}
		return { clientId: payload.sub, scope: this.scope };
	}
}
