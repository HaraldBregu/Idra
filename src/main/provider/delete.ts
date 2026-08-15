import fs from 'node:fs';
import { ProviderError } from './error';
import { providerPath } from './path';

export function deleteProvider(dataDirectory: string): boolean {
	const filePath = providerPath(dataDirectory);
	if (!fs.existsSync(filePath)) return false;
	if (fs.lstatSync(filePath).isSymbolicLink()) {
		throw new ProviderError(400, 'The provider configuration cannot be a symbolic link.');
	}
	fs.rmSync(filePath);
	return true;
}
