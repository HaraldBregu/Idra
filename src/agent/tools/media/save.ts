import fs from 'node:fs/promises';
import path from 'node:path';
import { agentLocation } from '../../../shared/agent_location';
import { resolveUserPath } from '../../../shared/user_path';

export async function saveMedia(
	prefix: string,
	extension: string,
	base64: string,
	directory?: string,
	signal?: AbortSignal
): Promise<string> {
	signal?.throwIfAborted();
	const targetDir = resolveUserPath(directory ?? '.', agentLocation());
	await fs.mkdir(targetDir, { recursive: true });
	signal?.throwIfAborted();
	const filePath = path.join(targetDir, `${prefix}-${Date.now()}.${extension}`);
	await fs.writeFile(filePath, Buffer.from(base64, 'base64'), { signal });
	return filePath;
}
