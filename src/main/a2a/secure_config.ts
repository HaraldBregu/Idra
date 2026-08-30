import path from 'node:path';
import { decodeConfigurationKey } from '../config/key';
import { resolvePublicUrl } from './public_url';

export interface SecureA2aConfig {
	adminToken: string;
	dataDirectory: string;
	encryptionKey: Buffer;
	publicUrl: string;
	tasksDirectory: string;
	workspaceDirectory: string;
}

interface SecureA2aConfigInput {
	adminToken?: string | null;
	configurationKey?: string | null;
	dataDirectory: string;
	publicUrl?: string | null;
}

export function resolveSecureA2aConfig(input: SecureA2aConfigInput): SecureA2aConfig {
	const adminToken =
		input.adminToken === undefined
			? process.env.IDRA_ADMIN_TOKEN?.trim()
			: input.adminToken?.trim();
	const rawKey =
		input.configurationKey === undefined
			? process.env.IDRA_CONFIG_KEY?.trim()
			: input.configurationKey?.trim();
	const publicUrl =
		input.publicUrl === undefined ? process.env.IDRA_PUBLIC_URL?.trim() : input.publicUrl?.trim();
	if (!adminToken || Buffer.byteLength(adminToken, 'utf8') < 32) {
		throw new Error('IDRA_ADMIN_TOKEN must contain at least 32 UTF-8 bytes.');
	}
	if (!rawKey) throw new Error('IDRA_CONFIG_KEY is required.');
	if (!publicUrl) throw new Error('IDRA_PUBLIC_URL is required.');
	const dataDirectory = path.resolve(input.dataDirectory);
	return {
		adminToken,
		dataDirectory,
		encryptionKey: decodeConfigurationKey(rawKey),
		publicUrl: resolvePublicUrl(publicUrl),
		tasksDirectory: path.join(dataDirectory, 'a2a', 'tasks'),
		workspaceDirectory: path.join(dataDirectory, 'workspace'),
	};
}
