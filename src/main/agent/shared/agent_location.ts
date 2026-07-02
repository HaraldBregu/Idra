import path from 'node:path';
import { userDataLocation } from '../../shared/user_data_location';

export function agentLocation(): string {
	return path.join(userDataLocation(), 'agent');
}
