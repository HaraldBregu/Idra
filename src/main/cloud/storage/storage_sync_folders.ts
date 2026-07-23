import path from 'node:path';
import type { StorageSyncFolder } from '../../../shared/storage_types';
import { agentLocation } from '../../shared/agent_location';

export function syncFolders(): StorageSyncFolder[] {
	return [
		{ key: 'library', path: path.join(agentLocation(), 'library') },
		{ key: 'notes', path: path.join(agentLocation(), 'notes') },
	];
}
