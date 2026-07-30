import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { cronStorePath } from '../../app/cron/cron_store';
import { healthStorePath } from '../health/health_store';
import { skillsRoot } from '../skills/skills_root';
import { isPathWithin } from './policy_path';

const SYSTEM_STORE_ROOTS = [path.dirname(cronStorePath), path.dirname(healthStorePath), skillsRoot];

export function systemPolicyAllows(targets: string[], agentDirectory: string): boolean {
	const roots = [agentDirectory, ...SYSTEM_STORE_ROOTS].map(realPath);
	return (
		targets.length > 0 &&
		targets.every((target) => roots.some((root) => isPathWithin(root, target)))
	);
}
