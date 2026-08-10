import fs from 'node:fs';
import path from 'node:path';
import type { SkillPolicyState } from '../../../shared/skills_types';
import { userDataLocation } from '../../shared/user_data_location';

export function readSkillPolicyState(): SkillPolicyState {
	const policyPath = path.resolve(userDataLocation(), 'settings', 'skills.json');
	try {
		const parsed = JSON.parse(fs.readFileSync(policyPath, 'utf8')) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { skills: {} };
		const skills = (parsed as { skills?: unknown }).skills;
		return skills && typeof skills === 'object' && !Array.isArray(skills)
			? { skills: skills as SkillPolicyState['skills'] }
			: { skills: {} };
	} catch {
		return { skills: {} };
	}
}
