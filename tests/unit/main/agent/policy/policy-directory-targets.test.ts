import path from 'node:path';
import { directoryPermissionTargets } from '../../../../../src/main/agent/policy/policy_directory_targets';
import { registry, type ProcessSession } from '../../../../../src/main/agent/tools/run_process';

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
		['health_settings_update', 'settings.health.json'],
		['complete_bootstrap', 'BOOTSTRAP.md'],
		['create_schedule', 'cron.json'],
	] as const)('maps %s to its agent-owned resource', (toolName, fileName) => {
		expect(directoryPermissionTargets(toolName, {}, agentDir)).toEqual([
			path.join(agentDir, fileName),
		]);
	});

	it('maps generated media and loaded skills inside the agent directory', () => {
		expect(directoryPermissionTargets('create_image', {}, agentDir)).toEqual([agentDir]);
		expect(directoryPermissionTargets('create_sound', { directory: 'clips' }, agentDir)).toEqual([
			path.join(agentDir, 'clips'),
		]);
		expect(directoryPermissionTargets('load_skill', { name: 'example' }, agentDir)).toEqual([
			path.join(agentDir, 'skills', 'example'),
		]);
	});

	it.each(['create_note', 'read_note', 'update_note', 'delete_note', 'search_notes'])(
		'maps %s to the agent notes directory',
		(toolName) => {
			expect(directoryPermissionTargets(toolName, {}, agentDir)).toEqual([
				path.join(agentDir, 'notes'),
			]);
		}
	);

	it('uses the originating exec workdir for process calls', () => {
		const session = {
			id: 'policy-session',
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
