import { createHash, randomBytes } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { app, ipcMain, shell, systemPreferences } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import type {
	MicrophonePermissionSettings,
	MicrophoneSystemPermissionStatus,
	CameraPermissionSettings,
	CameraSystemPermissionStatus,
	SystemPreferencePaneId,
} from '../../shared/app-permissions';
import { wrapSimpleHandler } from './core/error-handler';
import { AppChannels } from '../../shared/ipc-channels';
import type { OAuthAuthorizeInput, OAuthAuthorizeResult } from '../../shared/connectors';

const SYSTEM_PREFERENCE_PANES: Record<SystemPreferencePaneId, string> = {
	Accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
	ScreenCapture: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
	Camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
	Microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
};
import { normalizeExternalUrl } from '../../shared/external-links';

type OAuthTokenResponse = {
	readonly access_token?: string;
	readonly refresh_token?: string;
	readonly token_type?: string;
	readonly scope?: string;
	readonly expires_in?: number;
	readonly error?: string;
	readonly error_description?: string;
};

type OAuthUserInfoResponse = {
	readonly email?: string;
};

function getMicrophoneSystemStatus(): MicrophoneSystemPermissionStatus {
	if (process.platform !== 'darwin') return 'unknown';

	try {
		return systemPreferences.getMediaAccessStatus('microphone');
	} catch {
		return 'unknown';
	}
}

function canRequestMicrophoneAccess(status: MicrophoneSystemPermissionStatus): boolean {
	return process.platform === 'darwin' && status === 'not-determined';
}

function microphoneSettings(enabled: boolean): MicrophonePermissionSettings {
	const systemStatus = getMicrophoneSystemStatus();
	return {
		enabled,
		systemStatus,
		canRequest: canRequestMicrophoneAccess(systemStatus),
	};
}

function getCameraSystemStatus(): CameraSystemPermissionStatus {
	if (process.platform !== 'darwin') return 'unknown';
	try {
		return systemPreferences.getMediaAccessStatus('camera');
	} catch {
		return 'unknown';
	}
}

function canRequestCameraAccess(status: CameraSystemPermissionStatus): boolean {
	return process.platform === 'darwin' && status === 'not-determined';
}

function cameraSettings(enabled: boolean): CameraPermissionSettings {
	const systemStatus = getCameraSystemStatus();
	return {
		enabled,
		systemStatus,
		canRequest: canRequestCameraAccess(systemStatus),
	};
}

async function openPathOrThrow(target: string): Promise<void> {
	const error = await shell.openPath(target);
	if (error) {
		throw new Error(error);
	}
}

async function authorizeOAuth(oauth: OAuthAuthorizeInput): Promise<OAuthAuthorizeResult> {
	const clientId = requiredEnv(oauth.clientIdEnv);
	const clientSecret = oauth.clientSecretEnv ? requiredEnv(oauth.clientSecretEnv) : undefined;
	const state = base64Url(randomBytes(24));
	const codeVerifier = base64Url(randomBytes(32));
	const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());
	const callback = await waitForOAuthCallback(state);
	const redirectUri = callback.redirectUri;
	const authorizationUrl = new URL(oauth.authorizationUrl);
	authorizationUrl.searchParams.set('client_id', clientId);
	authorizationUrl.searchParams.set('redirect_uri', redirectUri);
	authorizationUrl.searchParams.set('response_type', 'code');
	authorizationUrl.searchParams.set('scope', oauth.scopes.join(' '));
	authorizationUrl.searchParams.set('state', state);
	authorizationUrl.searchParams.set('code_challenge', codeChallenge);
	authorizationUrl.searchParams.set('code_challenge_method', 'S256');
	authorizationUrl.searchParams.set('include_granted_scopes', 'true');
	if (oauth.accessType) authorizationUrl.searchParams.set('access_type', oauth.accessType);
	if (oauth.prompt) authorizationUrl.searchParams.set('prompt', oauth.prompt);

	try {
		await shell.openExternal(authorizationUrl.toString());
		const code = await callback.code;
		const token = await exchangeOAuthCode({
			clientId,
			clientSecret,
			code,
			codeVerifier,
			redirectUri,
			tokenUrl: oauth.tokenUrl,
		});
		const accessToken = requiredToken(token.access_token);
		const accountEmail = oauth.userInfoUrl
			? await readOAuthAccountEmail(oauth.userInfoUrl, accessToken)
			: undefined;
		const expiresAt = token.expires_in
			? new Date(Date.now() + token.expires_in * 1000).toISOString()
			: undefined;
		return {
			service: oauth.service,
			serviceId: oauth.serviceId,
			authorizationUrl: oauth.authorizationUrl,
			redirectUri,
			scopes: oauth.scopes,
			accessToken,
			refreshToken: token.refresh_token,
			tokenType: token.token_type,
			scope: token.scope,
			expiresAt,
			accountEmail,
			connectedAt: new Date().toISOString(),
		};
	} catch (error) {
		callback.close();
		throw error;
	}
}

function readOAuthAuthorizeInput(input: unknown): OAuthAuthorizeInput {
	const raw = requireRecord(input, 'OAuth authorization');
	const service = readString(raw.service) ?? '';
	const clientIdEnv = readString(raw.clientIdEnv) ?? '';
	const authorizationUrl = readString(raw.authorizationUrl) ?? '';
	const tokenUrl = readString(raw.tokenUrl) ?? '';
	const scopes = readStringArray(raw.scopes) ?? [];
	if (!service) throw new Error('OAuth service is required.');
	if (!clientIdEnv) throw new Error('OAuth client id environment variable is required.');
	if (!authorizationUrl) throw new Error('OAuth authorization URL is required.');
	if (!tokenUrl) throw new Error('OAuth token URL is required.');
	if (scopes.length === 0) throw new Error('At least one OAuth scope is required.');
	return {
		service,
		serviceId: readString(raw.serviceId),
		clientIdEnv,
		clientSecretEnv: readString(raw.clientSecretEnv),
		authorizationUrl,
		tokenUrl,
		userInfoUrl: readString(raw.userInfoUrl),
		scopes,
		accessType: readString(raw.accessType),
		prompt: readString(raw.prompt),
	};
}

function requiredEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is required for OAuth authorization.`);
	return value;
}

function requiredToken(value?: string): string {
	if (!value) throw new Error('OAuth token response did not include an access token.');
	return value;
}

function base64Url(value: Buffer): string {
	return value
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/u, '');
}

async function waitForOAuthCallback(expectedState: string): Promise<{
	readonly redirectUri: string;
	readonly code: Promise<string>;
	readonly close: () => void;
}> {
	let server: http.Server | undefined;
	const code = new Promise<string>((resolve, reject) => {
		server = http.createServer((request, response) => {
			try {
				const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
				if (url.pathname !== '/oauth/callback') {
					response.writeHead(404);
					response.end('Not found');
					return;
				}
				const error = url.searchParams.get('error');
				if (error) throw new Error(url.searchParams.get('error_description') ?? error);
				if (url.searchParams.get('state') !== expectedState) throw new Error('OAuth state mismatch.');
				const nextCode = url.searchParams.get('code');
				if (!nextCode) throw new Error('OAuth authorization code is missing.');
				response.writeHead(200, { 'Content-Type': 'text/html' });
				response.end('<!doctype html><title>Connected</title><p>You can return to Friday.</p>');
				resolve(nextCode);
			} catch (error) {
				response.writeHead(400, { 'Content-Type': 'text/plain' });
				response.end(error instanceof Error ? error.message : String(error));
				reject(error);
			} finally {
				server?.close();
			}
		});
	});
	await new Promise<void>((resolve, reject) => {
		server?.once('error', reject);
		server?.listen(0, '127.0.0.1', () => resolve());
	});
	const address = server?.address() as AddressInfo | null;
	if (!address) throw new Error('Could not open OAuth callback server.');
	return {
		redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
		code,
		close: () => server?.close(),
	};
}

async function exchangeOAuthCode(input: {
	readonly clientId: string;
	readonly clientSecret?: string;
	readonly code: string;
	readonly codeVerifier: string;
	readonly redirectUri: string;
	readonly tokenUrl: string;
}): Promise<OAuthTokenResponse> {
	const body = new URLSearchParams({
		client_id: input.clientId,
		code: input.code,
		code_verifier: input.codeVerifier,
		grant_type: 'authorization_code',
		redirect_uri: input.redirectUri,
	});
	if (input.clientSecret) body.set('client_secret', input.clientSecret);
	const response = await fetch(input.tokenUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});
	const data = await response.json() as OAuthTokenResponse;
	if (!response.ok || data.error) {
		throw new Error(data.error_description ?? data.error ?? `OAuth token exchange failed (${response.status}).`);
	}
	return data;
}

async function readOAuthAccountEmail(userInfoUrl: string, accessToken: string): Promise<string | undefined> {
	const response = await fetch(userInfoUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) return undefined;
	const data = await response.json() as OAuthUserInfoResponse;
	return data.email;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(`${label} is required.`);
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error('OAuth scopes must be an array of strings.');
	}
	return value.map((entry) => entry.trim()).filter(Boolean);
}

export class AppIpc implements IpcModule {
	readonly name = 'app';

	private trayEnabled = true;

	register(container: MainServiceContainer, eventBus: EventBus): void {
			const logger = container.get('logger');
			const appPermissions = container.get('appPermissions');

		// Open application data folder in system file explorer
		ipcMain.handle(
			AppChannels.openAppDataFolder,
			wrapSimpleHandler(async () => {
				await openPathOrThrow(app.getPath('userData'));
			}, AppChannels.openAppDataFolder)
		);

		ipcMain.handle(
			AppChannels.openExternalUrl,
			wrapSimpleHandler(async (url: string) => {
				const externalUrl = normalizeExternalUrl(url);
				if (!externalUrl) {
					throw new Error('External URL must use HTTP or HTTPS.');
				}
				await shell.openExternal(externalUrl);
			}, AppChannels.openExternalUrl)
		);

		ipcMain.handle(
			AppChannels.authorizeOAuth,
			wrapSimpleHandler(async (input: unknown) => {
				const oauth = readOAuthAuthorizeInput(input);
				return authorizeOAuth(oauth);
			}, AppChannels.authorizeOAuth)
		);

		ipcMain.handle(
			AppChannels.setTrayEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				this.trayEnabled = enabled;
				eventBus.emit('tray:set-enabled', { enabled });
			}, AppChannels.setTrayEnabled)
		);

		ipcMain.handle(
			AppChannels.getTrayEnabled,
			wrapSimpleHandler(() => {
				return this.trayEnabled;
			}, AppChannels.getTrayEnabled)
		);

		ipcMain.handle(
			AppChannels.getMicrophonePermission,
			wrapSimpleHandler(() => {
				return microphoneSettings(appPermissions.getMicrophoneEnabled());
			}, AppChannels.getMicrophonePermission)
		);

		ipcMain.handle(
			AppChannels.setMicrophoneEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				const next = appPermissions.setMicrophoneEnabled(Boolean(enabled));
				return microphoneSettings(next.microphoneEnabled);
			}, AppChannels.setMicrophoneEnabled)
		);

		ipcMain.handle(
			AppChannels.requestMicrophonePermission,
			wrapSimpleHandler(async () => {
				const enabled = appPermissions.getMicrophoneEnabled();
				if (process.platform === 'darwin' && enabled) {
					await systemPreferences.askForMediaAccess('microphone');
				}
				return microphoneSettings(enabled);
			}, AppChannels.requestMicrophonePermission)
		);

		ipcMain.handle(
			AppChannels.openSystemPreference,
			wrapSimpleHandler(async (pane: SystemPreferencePaneId) => {
				const url = SYSTEM_PREFERENCE_PANES[pane];
				if (!url) {
					throw new Error(`Unknown system preference pane: ${pane}`);
				}
				await shell.openExternal(url);
			}, AppChannels.openSystemPreference)
		);

		ipcMain.handle(
			AppChannels.getCameraPermission,
			wrapSimpleHandler(() => {
				return cameraSettings(appPermissions.getCameraEnabled());
			}, AppChannels.getCameraPermission)
		);

		ipcMain.handle(
			AppChannels.setCameraEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				const next = appPermissions.setCameraEnabled(Boolean(enabled));
				return cameraSettings(next.cameraEnabled);
			}, AppChannels.setCameraEnabled)
		);

		ipcMain.handle(
			AppChannels.requestCameraPermission,
			wrapSimpleHandler(async () => {
				const enabled = appPermissions.getCameraEnabled();
				if (process.platform === 'darwin' && enabled) {
					await systemPreferences.askForMediaAccess('camera');
				}
				return cameraSettings(enabled);
			}, AppChannels.requestCameraPermission)
		);

		ipcMain.handle(
			ProviderChannels.getModels,
			wrapSimpleHandler(async (provider: PublicProvider) => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}

				const apiKey = storedProvider.apiKey.trim();
				if (!apiKey) {
					throw new Error(`API key not configured for provider: ${storedProvider.id}`);
				}

				const normalizedProviderId = storedProvider.id.trim().toLowerCase();

				if (hasDefaultAgentModels(normalizedProviderId)) {
					return getDefaultAgentModels(normalizedProviderId);
				}

				const isKnownProvider = DEFAULT_PROVIDERS.some(
					(defaultProvider) => defaultProvider.id.trim().toLowerCase() === normalizedProviderId
				);
				if (isKnownProvider) {
					return [];
				}

				throw new Error(`Unsupported provider id: ${storedProvider.id}`);
			}, ProviderChannels.getModels)
		);

		ipcMain.handle(
			ProviderChannels.getSpeechToTextModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getSpeechToTextModels(storedProvider.id);
			}, ProviderChannels.getSpeechToTextModels)
		);

		ipcMain.handle(
			ProviderChannels.getTextToSpeechModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getTextToSpeechModels(storedProvider.id);
			}, ProviderChannels.getTextToSpeechModels)
		);

		ipcMain.handle(
			ProviderChannels.getImageCreatorModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getImageCreatorModelsForProvider(storedProvider);
			}, ProviderChannels.getImageCreatorModels)
		);

		ipcMain.handle(
			ProviderChannels.getTextToVideoModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getTextToVideoModels(storedProvider.id);
			}, ProviderChannels.getTextToVideoModels)
		);

		ipcMain.handle(
			ProviderChannels.getTextToSoundModels,
			wrapSimpleHandler((provider: PublicProvider): Model[] => {
				const storedProvider = store.getProviderById(provider.id);
				if (!storedProvider) {
					throw new Error(`Provider not found: ${provider.id}`);
				}
				return getMusicCreatorModels(storedProvider.id);
			}, ProviderChannels.getTextToSoundModels)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
