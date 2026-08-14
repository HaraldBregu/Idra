import path from 'node:path';
import { userDataLocation } from './user_data_location';

export function libraryLocation(): string {
	return path.join(userDataLocation(), 'library');
}
