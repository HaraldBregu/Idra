import { rmSync } from 'node:fs';
import path from 'node:path';
import { userDataLocation } from '../../../shared/user_data_location';
import { readRagManifest } from './rag_manifest';

export function purgeRagManifest(indexName: string, generation?: string): boolean {
	const manifest = readRagManifest();
	if (
		!manifest ||
		manifest.indexName !== indexName ||
		(generation && manifest.activeNamespace !== generation)
	) {
		return false;
	}
	if (manifest.artifactFile && path.basename(manifest.artifactFile) === manifest.artifactFile) {
		rmSync(path.join(userDataLocation(), 'rag', manifest.artifactFile), { force: true });
	}
	rmSync(path.join(userDataLocation(), 'rag', 'index.json'), { force: true });
	return true;
}
