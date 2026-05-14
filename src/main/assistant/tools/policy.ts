import type { AgentTool } from './types';

export type ToolProfile = 'minimal' | 'standard' | 'full';

export interface PolicyConfig {
	profile: ToolProfile;
	allow: string[];
	deny: string[];
}

const PROFILE_ALLOW: Record<ToolProfile, string[] | 'all'> = {
	minimal: ['read', 'find', 'ask_human', 'get_workspace_content', 'get_workspace_path'],
	standard: [
		'read',
		'write',
		'edit',
		'find',
		'exec',
		'ask_human',
		'get_workspace_content',
		'get_workspace_path',
		'get_assistant_service',
		'get_assistant_model',
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
		if (profileAllow !== 'all' && !profileAllow.includes(t.name)) return false;
		if (cfg.deny.some((p) => globMatch(p, t.name))) return false;
		if (cfg.allow.length > 0 && !cfg.allow.some((p) => globMatch(p, t.name))) return false;
		return true;
	};
	return all.filter(pass);
}
