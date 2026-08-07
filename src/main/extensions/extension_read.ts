import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { extensionManifestPath } from './extension_manifest';
import { extensionsRoot } from './extension_root';
import { isExtensionManifest } from './extension_manifest_validate';
import { isExtensionEntry } from './extension_entry_validate';
import type { ExtensionManifest } from './extension_types';

function readPackageManifestFromFridayMetadata(directory: string): ExtensionManifest | null {
	const file = path.join(directory, 'package.json');
	if (!existsSync(file)) return null;

	try {
		const packageJson = JSON.parse(readFileSync(file, 'utf8')) as {
			name?: string;
			description?: string;
			version?: string;
			friday?: {
				title?: unknown;
				description?: unknown;
				category?: unknown;
				version?: unknown;
				distribution?: {
					dir?: unknown;
					entry?: unknown;
				};
			};
		};

		const friday = packageJson.friday;
		if (!friday || typeof friday !== 'object') return null;

		const title =
			typeof friday.title === 'string' && friday.title.trim().length > 0
				? friday.title.trim()
				: packageJson.name?.trim();
		const description =
			typeof friday.description === 'string' && friday.description.trim().length > 0
				? friday.description.trim()
				: packageJson.description?.trim();
		const category =
			typeof friday.category === 'string' && friday.category.trim().length > 0
				? friday.category.trim()
				: 'utility';
		const version =
			typeof friday.version === 'string' && friday.version.trim().length > 0
				? friday.version.trim()
				: packageJson.version?.trim();

		if (!title || !description || !version) return null;

		const distribution = friday.distribution;
		if (!distribution || typeof distribution !== 'object') return null;
		const distDir =
			typeof distribution.dir === 'string' && distribution.dir.trim().length > 0
				? distribution.dir.trim().replace(/\\+/g, '/').replace(/\/+$/, '')
				: '';
		const entry =
			typeof distribution.entry === 'string' && distribution.entry.trim().length > 0
				? distribution.entry.trim().replace(/^\/+/, '')
				: '';
		if (!entry) return null;

		const manifestEntry = distDir ? `${distDir}/${entry}` : entry;
		if (!isExtensionEntry(manifestEntry)) return null;

		const candidate: ExtensionManifest = {
			title,
			description,
			metadata: {
				version,
				category,
				entry: manifestEntry,
			},
		};
		return isExtensionManifest(candidate) ? candidate : null;
	} catch {
		return null;
	}
}

export function readExtensionManifest(id: string, appLocation?: string): ExtensionManifest | null {
	const file = extensionManifestPath(id, appLocation);
	if (existsSync(file)) {
		try {
			const manifest = JSON.parse(readFileSync(file, 'utf8')) as unknown;
			return isExtensionManifest(manifest) ? manifest : null;
		} catch {
			return null;
		}
	}

	return readPackageManifestFromFridayMetadata(extensionsRoot(appLocation), id, appLocation);
}

export function readExtensionManifestFromDirectory(directory: string): ExtensionManifest | null {
	const file = path.join(directory, 'manifest.json');
	if (existsSync(file)) {
		try {
			const manifest = JSON.parse(readFileSync(file, 'utf8')) as unknown;
			return isExtensionManifest(manifest) ? manifest : null;
		} catch {
			return null;
		}
	}

	return readPackageManifestFromFridayMetadata(directory);
}
