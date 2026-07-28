import path from 'node:path';
import { userDataLocation } from './user_data_location';

export function agentLocation(): string {
	return path.join(userDataLocation(), 'workspace');
}
