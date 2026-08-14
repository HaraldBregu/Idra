import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { isExtensionId } from './extension_id';
import { extensionsRoot } from './extension_root';
import { readExtensionManifestFromDirectory } from './extension_read';
import type { ExtensionImportResult, ExtensionImportSkipped } from '../shared/extension_types';
import type { Extension } from './extension_types';

function createSkipped(sourcePath: string, reason: string): ExtensionImportSkipped {
	return {
		name: path.basename(sourcePath),
		sourcePath,
		reason,
	};
}

function readExtension(directory: string): Extension | null {
	const id = path.basename(directory);
	const manifest = readExtensionManifestFromDirectory(directory);
	if (!manifest) return null;

	const entryPath = path.join(directory, manifest.metadata.entry);
	try {
		if (!existsSync(entryPath) || !statSync(entryPath).isFile()) return null;
	} catch {
		return null;
	}

	return { id, ...manifest };
}

export function importExtensions(sources: string[]): ExtensionImportResult {
	const extensions: Extension[] = [];
	const skipped: ExtensionImportSkipped[] = [];
	mkdirSync(extensionsRoot(), { recursive: true });

	for (const source of sources) {
		const id = path.basename(source);
		if (!isExtensionId(id)) {
			skipped.push(createSkipped(source, 'Invalid extension folder name.'));
			continue;
		}

		if (!existsSync(source) || !statSync(source).isDirectory()) {
			skipped.push(createSkipped(source, 'Source folder is missing.'));
			continue;
		}

		const manifest = readExtension(source);
		if (!manifest) {
			skipped.push(
				createSkipped(
					source,
					'Missing or invalid manifest. Expected manifest.json or package.json.'
				)
			);
			continue;
		}

		const destination = path.join(extensionsRoot(), id);
		rmSync(destination, { recursive: true, force: true });
		cpSync(source, destination, { recursive: true });
		extensions.push(manifest);
	}

	return { imported: extensions, skipped };
}
