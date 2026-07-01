import path from 'node:path';
import { userDataLocation } from '../../shared/user-data-location';

export function agentLocation(): string {
	return path.join(userDataLocation(), 'agent');
}
