import path from 'node:path';
import { userDataLocation } from './user-data-location';

export function agentLocation(): string {
	return path.join(userDataLocation(), 'agent');
}
