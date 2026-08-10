import path from 'node:path';
import { userDataLocation } from '../../../shared/user_data_location';

export function wikiLocation(): string {
	return path.resolve(userDataLocation(), 'wiki');
}
