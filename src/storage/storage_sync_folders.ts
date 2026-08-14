import type { StorageSyncFolder } from '../../shared/storage_types';
import { agentLocation } from '../shared/agent_location';

export function syncFolders(): StorageSyncFolder[] {
	return [{ key: 'agent', path: agentLocation() }];
}
