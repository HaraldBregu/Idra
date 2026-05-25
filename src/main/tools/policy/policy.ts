import type { AgentTool } from '../core/types';
import { localToolNamesForProfile, type LocalToolProfile } from '../catalog/catalog';

export type ToolProfile = LocalToolProfile;

export interface PolicyConfig {
	profile: ToolProfile;
	allow: string[];
	alsoAllow?: string[];
	deny: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
	exec?: Record<string, unknown>;
}

function profileAllow(profile: ToolProfile): readonly string[] | 'all' {
	return profile === 'full' ? 'all' : localToolNamesForProfile(profile);
}

function globMatch(pattern: string, name: string): boolean {
	if (pattern === name) return true;
	if (!pattern.includes('*')) return false;
	const re = new RegExp(
		'^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
	);
	return re.test(name);
}

export function filterTools(all: AgentTool[], cfg: PolicyConfig): AgentTool[] {
	const allowByProfile = profileAllow(cfg.profile);
	const alsoAllow = cfg.alsoAllow ?? [];
	const pass = (t: AgentTool): boolean => {
		if (
			allowByProfile !== 'all' &&
			!allowByProfile.includes(t.name) &&
			!alsoAllow.some((p) => globMatch(p, t.name))
		) {
			return false;
		}
		if (cfg.deny.some((p) => globMatch(p, t.name))) return false;
		if (cfg.allow.length > 0 && !cfg.allow.some((p) => globMatch(p, t.name))) return false;
		return true;
	};
	return all.filter(pass);
}
