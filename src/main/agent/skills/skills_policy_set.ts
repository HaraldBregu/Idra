import type { SkillPolicy } from '../../../shared/skills_types';
import { readSkillPolicyState } from './skills_policy_read';
import { writeSkillPolicyState } from './skills_policy_write';

export function setSkillPolicy(id: string, policy: SkillPolicy): void {
	const state = readSkillPolicyState();
	state.skills[id] = { ...state.skills[id], ...policy };
	writeSkillPolicyState(state);
}
