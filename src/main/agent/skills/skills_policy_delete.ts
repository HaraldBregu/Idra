import { readSkillPolicyState } from './skills_policy_read';
import { writeSkillPolicyState } from './skills_policy_write';

export function deleteSkillPolicy(id: string): void {
	const state = readSkillPolicyState();
	delete state.skills[id];
	writeSkillPolicyState(state);
}
