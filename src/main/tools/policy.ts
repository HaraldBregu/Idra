import type { AgentTool } from './types';

export type ToolProfile = 'minimal' | 'coding' | 'standard' | 'full';

export interface PolicyConfig {
	profile: ToolProfile;
	allow: string[];
	deny: string[];
}

const PROFILE_ALLOW: Record<ToolProfile, string[] | 'all'> = {
	minimal: ['read', 'update_plan', 'find', 'ask_human', 'get_workspace_content', 'get_workspace_path'],
	coding: [
		'read',
		'write',
		'edit',
		'apply_patch',
		'find',
		'exec',
		'process',
		'web_fetch',
		'update_plan',
		'ask_human',
		'get_workspace_content',
		'get_workspace_path',
		'get_agent_service',
		'get_agent_model',
		'cron',
		'cron_list',
	],
	standard: [
		'read',
		'write',
		'edit',
		'apply_patch',
		'find',
		'exec',
		'process',
		'web_fetch',
		'update_plan',
		'ask_human',
		'get_workspace_content',
		'get_workspace_path',
		'get_agent_service',
		'get_agent_model',
		'cron',
		'cron_list',
	],
	full: 'all',
};

function globMatch(pattern: string, name: string): boolean {
	if (pattern === name) return true;
	if (!pattern.includes('*')) return false;
	const re = new RegExp(
		'^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
	);
	return re.test(name);
}

export function filterTools(all: AgentTool[], cfg: PolicyConfig): AgentTool[] {
	const profileAllow = PROFILE_ALLOW[cfg.profile];
	const pass = (t: AgentTool): boolean => {
		if (t.name === 'apply_patch') {
			const writeCandidate = { ...t, name: 'write' };
			return pass(writeCandidate);
		}
		if (profileAllow !== 'all' && !profileAllow.includes(t.name)) return false;
		if (cfg.deny.some((p) => globMatch(p, t.name))) return false;
		if (cfg.allow.length > 0 && !cfg.allow.some((p) => globMatch(p, t.name))) return false;
		return true;
	};
	return all.filter(pass);
}
