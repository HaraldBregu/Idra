import type { StorageSyncFolder } from '../../../shared/storage_types';
import { libraryLocation } from '../../shared/library_location';

export function syncFolders(): StorageSyncFolder[] {
	return [{ key: 'library', path: libraryLocation() }];
}
