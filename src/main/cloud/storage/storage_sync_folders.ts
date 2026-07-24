import path from 'node:path';
import type { StorageSyncFolder } from '../../../shared/storage_types';
import { agentLocation } from '../../shared/agent_location';
import { libraryLocation } from '../../shared/library_location';

export function syncFolders(): StorageSyncFolder[] {
	return [
		{ key: 'library', path: libraryLocation() },
		{ key: 'projects', path: path.join(agentLocation(), 'projects') },
	];
}
