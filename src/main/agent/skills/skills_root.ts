import path from 'node:path';
import { userDataLocation } from '../../shared/user_data_location';

export const skillsRoot = path.resolve(userDataLocation(), 'skills');

export function getRoot(): string {
	return skillsRoot;
}
