import path from 'node:path';
import { agentLocation } from '../shared/agent-location';

export const skillsRoot = path.resolve(agentLocation(), 'skills');

export function getRoot(): string {
	return skillsRoot;
}
