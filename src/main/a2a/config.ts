import net from 'node:net';
import path from 'node:path';

export interface A2aConfig {
	token: string;
	publicUrl: string;
	tasksDirectory: string;
	workspaceDirectory: string;
}

interface A2aConfigInput {
	dataDirectory: string;
	token?: string | null;
	publicUrl?: string | null;
}

export function resolveA2aConfig(input: A2aConfigInput): A2aConfig | undefined {
	const token = input.token === undefined ? process.env.IDRA_AGENT_TOKEN : input.token;
	const publicUrl = input.publicUrl === undefined ? process.env.IDRA_PUBLIC_URL : input.publicUrl;
	const hasToken = typeof token === 'string' && token.length > 0;
	const hasPublicUrl = typeof publicUrl === 'string' && publicUrl.trim().length > 0;

	if (!hasToken && !hasPublicUrl) return undefined;
	if (!hasToken || !hasPublicUrl) {
		throw new Error('IDRA_AGENT_TOKEN and IDRA_PUBLIC_URL must be configured together.');
	}
	if (Buffer.byteLength(token, 'utf8') < 32) {
		throw new Error('IDRA_AGENT_TOKEN must contain at least 32 UTF-8 bytes.');
	}

	let url: URL;
	try {
		url = new URL(publicUrl.trim());
	} catch {
		throw new Error('IDRA_PUBLIC_URL must be a valid URL origin.');
	}
	if (
		url.username ||
		url.password ||
		url.pathname !== '/' ||
		url.search ||
		url.hash ||
		(url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback(url.hostname)))
	) {
		throw new Error(
			'IDRA_PUBLIC_URL must be an HTTPS origin without credentials, path, query, or fragment; HTTP is allowed only for loopback development.'
		);
	}

	return {
		token,
		publicUrl: url.origin,
		tasksDirectory: path.join(path.resolve(input.dataDirectory), 'a2a', 'tasks'),
		workspaceDirectory: path.join(path.resolve(input.dataDirectory), 'workspace'),
	};
}

function isLoopback(hostname: string): boolean {
	if (hostname === 'localhost' || hostname === '[::1]' || hostname === '::1') return true;
	return net.isIP(hostname) === 4 && hostname.startsWith('127.');
}
