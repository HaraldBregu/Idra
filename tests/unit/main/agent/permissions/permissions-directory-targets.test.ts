import path from 'node:path';
import { directoryPermissionTargets } from '../../../../../src/main/agent/permissions/directory_permission_targets';
import { taskStorePath } from '../../../../../src/main/tasks/tasks_store';
import { healthStorePath } from '../../../../../src/main/agent/health/health_store';
import { registry, type ProcessSession } from '../../../../../src/main/agent/tools/core/process';
import { skillsRoot } from '../../../../../src/main/agent/skills/skills_root';

const agentDir = path.resolve('/appdata/agent');

describe('directoryPermissionTargets', () => {
	it('uses an exec working directory instead of its command', () => {
		expect(
			directoryPermissionTargets(
				'exec',
				{ command: 'npm test', workdir: '/workspace/app' },
				agentDir
			)
		).toEqual([path.resolve('/workspace/app')]);
	});

	it('uses the agent directory for exec without an explicit working directory', () => {
		expect(directoryPermissionTargets('exec', { command: 'npm test' }, agentDir)).toEqual([
			agentDir,
		]);
	});

	it('does not create an exec target without a command', () => {
		expect(directoryPermissionTargets('exec', { workdir: '/workspace/app' }, agentDir)).toEqual([]);
	});

	it('reuses file targets for filesystem tools', () => {
		expect(directoryPermissionTargets('write', { path: '/workspace/a.txt' }, agentDir)).toEqual([
			path.resolve('/workspace/a.txt'),
		]);
	});

	it('uses the containing folder for read', () => {
		expect(directoryPermissionTargets('read', { path: '/workspace/a.txt' }, agentDir)).toEqual([
			path.resolve('/workspace'),
		]);
	});

	it.each([
		['memory_save', 'MEMORY.md'],
		['health_update', 'HEALTH.md'],
		['complete_bootstrap', 'BOOTSTRAP.md'],
	] as const)('maps %s to its agent-owned resource', (toolName, fileName) => {
		expect(directoryPermissionTargets(toolName, {}, agentDir)).toEqual([
			path.join(agentDir, fileName),
		]);
	});

	it('maps schedule changes to the shared cron store', () => {
		expect(directoryPermissionTargets('create_schedule', {}, agentDir)).toEqual([taskStorePath]);
	});

	it('maps health settings changes to the shared health store', () => {
		expect(directoryPermissionTargets('health_settings_update', {}, agentDir)).toEqual([
			healthStorePath,
		]);
	});

	it('maps generated media and loaded skills inside the agent directory', () => {
		expect(directoryPermissionTargets('create_image', {}, agentDir)).toEqual([agentDir]);
		expect(directoryPermissionTargets('create_sound', { directory: 'clips' }, agentDir)).toEqual([
			path.join(agentDir, 'clips'),
		]);
		expect(directoryPermissionTargets('load_skill', { name: 'example' }, agentDir)).toEqual([
			path.join(skillsRoot, 'example'),
		]);
	});

	it('uses the originating exec workdir for process calls', () => {
		const session = {
			id: 'permission-session',
			workdir: '/workspace/app',
		} as ProcessSession;
		registry.register(session);
		try {
			expect(
				directoryPermissionTargets('process', { action: 'poll', sessionId: session.id }, agentDir)
			).toEqual([path.resolve('/workspace/app')]);
		} finally {
			registry.remove(session.id);
		}
	});
});
