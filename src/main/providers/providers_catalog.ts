import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { is } from '@electron-toolkit/utils';
import type { Provider } from '../../shared/providers_definitions';

type CatalogEntry = Provider & { readonly order?: number };

let cache: readonly Provider[] | undefined;

export function loadProviderCatalog(): readonly Provider[] {
	if (!cache) cache = readCatalog();
	return cache;
}

function readCatalog(): readonly Provider[] {
	const dir = is.dev
		? path.join(__dirname, '../../resources/providers')
		: path.join(process.resourcesPath, 'resources/providers');

	const entries: CatalogEntry[] = readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(dir, entry.name, 'provider.json'))
		.filter((filePath) => existsSync(filePath))
		.map((filePath) => JSON.parse(readFileSync(filePath, 'utf-8')) as CatalogEntry);

	const last = Number.MAX_SAFE_INTEGER;
	return entries.sort((a, b) => (a.order ?? last) - (b.order ?? last));
}
