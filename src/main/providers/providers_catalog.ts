import path from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
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

	const entries = readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.flatMap((entry) => readProvider(path.join(dir, entry.name, 'provider.json')));

	return entries.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
}

function readProvider(filePath: string): CatalogEntry[] {
	try {
		return [JSON.parse(readFileSync(filePath, 'utf-8')) as CatalogEntry];
	} catch {
		return [];
	}
}
