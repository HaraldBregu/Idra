import { BrowserWindow, desktopCapturer, net, protocol, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveWorkspaceFile } from './ipc/workspace';
import { agentLocation } from './shared/agent_location';
import type { LoggerService } from './shared';

const LOCAL_RESOURCE_SCHEME = 'local-resource';

export function registerLocalResourceProtocolScheme(): void {
	protocol.registerSchemesAsPrivileged([
		{
			scheme: LOCAL_RESOURCE_SCHEME,
			privileges: {
				standard: true,
				secure: true,
				bypassCSP: true,
				supportFetchAPI: true,
				stream: true,
			},
		},
	]);
}

export function registerLocalResourceProtocolHandler(
	logger: Pick<LoggerService, 'error'>
): void {
	protocol.handle(LOCAL_RESOURCE_SCHEME, async (request) => {
		try {
			const url = new URL(request.url);
			let pathname = decodeURIComponent(url.pathname);
			if (url.host === 'agent') {
				pathname = await resolveWorkspaceFile(agentLocation(), pathname.replace(/^\/+/, ''));
			} else if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(pathname)) {
				pathname = pathname.slice(1);
			}
			// Forward headers so media Range requests get 206 responses for seeking.
			return await net.fetch(pathToFileURL(pathname).toString(), {
				headers: request.headers,
			});
		} catch (err) {
			logger.error('App', `${LOCAL_RESOURCE_SCHEME} fetch failed for ${request.url}`, err);
			return new Response(null, { status: 500 });
		}
	});
}

export function setupMediaPermissionHandlers(): void {
	session.defaultSession.setPermissionCheckHandler(
		(webContents, permission, requestingOrigin, details) => {
			if (permission !== 'media') return false;
			if (details.mediaType !== 'audio' && details.mediaType !== 'video') return false;
			if (!details.isMainFrame) return false;
			if (!isAppWindowWebContents(webContents)) return false;
			return isTrustedMediaRequestSource(
				requestingOrigin,
				details.requestingUrl,
				details.securityOrigin
			);
		}
	);

	session.defaultSession.setPermissionRequestHandler(
		(webContents, permission, callback, details) => {
			if (permission !== 'media') {
				callback(false);
				return;
			}

			const mediaDetails = details as Electron.MediaAccessPermissionRequest;
			const requestsAudio = mediaDetails.mediaTypes?.includes('audio') ?? false;
			const requestsVideo = mediaDetails.mediaTypes?.includes('video') ?? false;
			const allowed =
				(requestsAudio || requestsVideo) &&
				mediaDetails.isMainFrame &&
				isAppWindowWebContents(webContents) &&
				isTrustedMediaRequestSource(
					undefined,
					mediaDetails.requestingUrl,
					mediaDetails.securityOrigin
				);

			callback(allowed);
		}
	);

	session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
		const trusted = isTrustedMediaRequestSource(
			undefined,
			request.frame?.url,
			request.securityOrigin
		);
		if (!trusted) {
			callback({});
			return;
		}
		desktopCapturer
			.getSources({ types: ['screen', 'window'] })
			.then((sources) => {
				const source = sources[0];
				callback(source ? { video: source } : {});
			})
			.catch(() => callback({}));
	});
}

function rendererDevOrigin(): string | null {
	const rendererUrl = process.env['ELECTRON_RENDERER_URL'];
	if (!rendererUrl) return null;

	try {
		return new URL(rendererUrl).origin;
	} catch {
		return null;
	}
}

function isTrustedRendererOrigin(origin?: string): boolean {
	if (!origin) return false;
	if (origin === 'file://') return true;
	const devOrigin = rendererDevOrigin();
	return Boolean(devOrigin && origin === devOrigin);
}

function isTrustedRendererUrl(url?: string): boolean {
	if (!url) return false;
	if (url.startsWith('file://')) return true;

	try {
		return isTrustedRendererOrigin(new URL(url).origin);
	} catch {
		return false;
	}
}

function isAppWindowWebContents(webContents: Electron.WebContents | null): boolean {
	return Boolean(webContents && BrowserWindow.fromWebContents(webContents));
}

function isTrustedMediaRequestSource(
	requestingOrigin: string | undefined,
	requestingUrl: string | undefined,
	securityOrigin: string | undefined
): boolean {
	return (
		isTrustedRendererOrigin(requestingOrigin) ||
		isTrustedRendererOrigin(securityOrigin) ||
		isTrustedRendererUrl(requestingUrl)
	);
}
