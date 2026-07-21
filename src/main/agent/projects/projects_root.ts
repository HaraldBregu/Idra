import path from 'node:path';
import { agentLocation } from '../../shared/agent_location';

export const projectsRoot = path.resolve(agentLocation(), 'projects');

export function getRoot(): string {
	return projectsRoot;
}
