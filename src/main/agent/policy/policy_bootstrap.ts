import { existsSync } from 'node:fs';
import path from 'node:path';
import { agentLocation } from '../../shared/agent_location';
import { BOOTSTRAP_FILE } from '../system/system_types';
import { isPathWithin } from './policy_path';

export function isBootstrapPath(dir: string): boolean {
	const workspace = path.resolve(agentLocation());
	if (!existsSync(path.join(workspace, BOOTSTRAP_FILE))) return false;
	return isPathWithin(workspace, dir);
}
