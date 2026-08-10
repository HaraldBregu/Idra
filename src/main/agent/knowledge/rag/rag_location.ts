import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { userDataLocation } from '../shared/user_data_location';

export function ragLocation(): string {
	const location = path.join(userDataLocation(), 'rag');
	mkdirSync(location, { recursive: true });
	return location;
}
