import fs from 'node:fs';
import path from 'node:path';
import type { SkillPolicyState } from '../../../shared/skills_types';
import { userDataLocation } from '../../shared/user_data_location';

export function writeSkillPolicyState(state: SkillPolicyState): void {
	const directory = path.resolve(userDataLocation(), 'settings');
	const policyPath = path.join(directory, 'skills.json');
	const temporaryPath = `${policyPath}.${process.pid}.tmp`;
	fs.mkdirSync(directory, { recursive: true });
	fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
	fs.renameSync(temporaryPath, policyPath);
}
