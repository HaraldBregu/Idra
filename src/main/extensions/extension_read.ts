import { existsSync, readFileSync } from 'node:fs';
import { extensionManifestPath } from './extension_manifest';
import { isExtensionManifest } from './extension_manifest_validate';
import type { ExtensionManifest } from './extension_types';

export function readExtensionManifest(id: string, appLocation?: string): ExtensionManifest | null {
	const file = extensionManifestPath(id, appLocation);
	if (!existsSync(file)) return null;

	try {
		const manifest = JSON.parse(readFileSync(file, 'utf8')) as unknown;
		return isExtensionManifest(manifest) ? manifest : null;
	} catch {
		return null;
	}
}
