import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';
import { cronStorePath } from '../../app/cron/cron_store';
import { skillsRoot } from '../skills/skills_root';
import { registry } from '../tools/run_process';
import { toolPermissionTargets } from './policy_targets';

const AGENT_FILES: Record<string, string> = {
	memory_save: 'MEMORY.md',
	memory_forget: 'MEMORY.md',
	health_update: 'HEALTH.md',
	health_settings_update: 'agent/settings.health.json',
	complete_bootstrap: 'BOOTSTRAP.md',
};
const MEDIA_TOOLS = new Set(['create_image', 'create_video', 'create_sound']);
const SCHEDULE_TOOLS = new Set([
	'create_schedule',
	'update_schedule',
	'pause_schedule',
	'resume_schedule',
	'delete_schedule',
	'get_schedule',
	'list_schedules',
	'run_schedule_now',
]);

export function directoryPermissionTargets(
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string
): string[] {
	if (toolName === 'exec') {
		if (typeof args.command !== 'string' || args.command.length === 0) return [];
		const workdir =
			typeof args.workdir === 'string' && args.workdir.length > 0 ? args.workdir : '.';
		return [realPath(resolveUserPath(workdir, baseDir))];
	}
	if (toolName === 'process') {
		const session = typeof args.sessionId === 'string' ? registry.get(args.sessionId) : undefined;
		return session ? [realPath(session.workdir)] : [];
	}
	if (typeof args.path === 'string' || toolName === 'apply_patch') {
		const targets = toolPermissionTargets(toolName, args, baseDir);
		return toolName === 'read' ? targets.map((target) => path.dirname(target)) : targets;
	}
	const fileName = AGENT_FILES[toolName];
	if (fileName) return [realPath(path.join(baseDir, fileName))];
	if (MEDIA_TOOLS.has(toolName)) {
		const directory = typeof args.directory === 'string' && args.directory ? args.directory : '.';
		return [realPath(resolveUserPath(directory, baseDir))];
	}
	if (SCHEDULE_TOOLS.has(toolName)) return [realPath(cronStorePath)];
	if (toolName === 'load_skill')
		return [realPath(path.join(skillsRoot, String(args.name ?? '')))];
	return [];
}
