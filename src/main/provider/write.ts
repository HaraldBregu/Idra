import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ProviderError } from './error';
import { providerPath } from './path';
import type { ProviderConfiguration } from './types';

export function writeProvider(dataDirectory: string, configuration: ProviderConfiguration): void {
	const resolvedDirectory = path.resolve(dataDirectory);
	const filePath = providerPath(resolvedDirectory);
	const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
	fs.mkdirSync(resolvedDirectory, { recursive: true });
	if (fs.existsSync(filePath) && fs.lstatSync(filePath).isSymbolicLink()) {
		throw new ProviderError(400, 'The provider configuration cannot be a symbolic link.');
	}
	try {
		fs.writeFileSync(temporaryPath, `${JSON.stringify(configuration, null, 2)}\n`, {
			flag: 'wx',
			mode: 0o600,
		});
		fs.renameSync(temporaryPath, filePath);
	} finally {
		fs.rmSync(temporaryPath, { force: true });
	}
}
