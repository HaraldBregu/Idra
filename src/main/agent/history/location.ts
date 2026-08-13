import path from 'node:path';
import { userDataLocation } from '../../shared/user_data_location';

export function fileHistoryLocation(): string {
	return path.join(userDataLocation(), 'history', 'files.json');
}
