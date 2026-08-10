import { completeBootstrapTool } from '../../../../../src/main/agent/tools/assistant/bootstrap_complete';
import { editTool } from '../../../../../src/main/agent/tools/core/edit';
import { updateHealthSettingsTool } from '../../../../../src/main/agent/tools/health/settings_update';
import { updateHealthTool } from '../../../../../src/main/agent/tools/health/update';
import { createScheduleTool } from '../../../../../src/main/agent/tools/tasks/create_schedule';
import { deleteScheduleTool } from '../../../../../src/main/agent/tools/tasks/delete_schedule';
import { pauseScheduleTool } from '../../../../../src/main/agent/tools/tasks/pause_schedule';
import { resumeScheduleTool } from '../../../../../src/main/agent/tools/tasks/resume_schedule';
import { runScheduleNowTool } from '../../../../../src/main/agent/tools/tasks/run_schedule_now';
import { updateScheduleTool } from '../../../../../src/main/agent/tools/tasks/update_schedule';
import { wikiIngestTool } from '../../../../../src/main/agent/tools/knowledge/ingest';
import { wikiLintTool } from '../../../../../src/main/agent/tools/knowledge/lint';
import { wikiRebuildTool } from '../../../../../src/main/agent/tools/knowledge/rebuild';
import { wikiReviewTool } from '../../../../../src/main/agent/tools/knowledge/review';
import { wikiSaveTool } from '../../../../../src/main/agent/tools/knowledge/save';

it.each([
	[updateHealthTool({ location: '/workspace' }), 'high', 'persistence', ['main']],
	[updateHealthSettingsTool, 'high', 'persistence', ['main']],
	[completeBootstrapTool, 'critical', 'persistence', ['main']],
	[wikiIngestTool, 'high', 'persistence', ['main']],
	[wikiSaveTool, 'high', 'persistence', ['main']],
	[wikiReviewTool, 'critical', 'persistence', ['main']],
	[wikiRebuildTool, 'high', 'persistence', ['main']],
] as const)(
	'%s cannot mutate persistently through trusted-main bypass',
	(tool, risk, effect, origins) => {
		expect(tool).toMatchObject({ risk, effect, hardApproval: true, allowedOrigins: origins });
	}
);

it.each([
	createScheduleTool,
	updateScheduleTool,
	deleteScheduleTool,
	pauseScheduleTool,
	resumeScheduleTool,
	runScheduleNowTool,
])('%s uses its scoped permission without forced approval', (tool) => {
	expect(tool.defaultPermission).toBe('allow');
	expect(tool.hardApproval).not.toBe(true);
	expect(tool.allowedOrigins).toBeUndefined();
});

it('uses ordinary policy approval for focused text edits', () => {
	expect(editTool).toMatchObject({ risk: 'high', effect: 'write' });
	expect(editTool.hardApproval).not.toBe(true);
});

it('hard-approves wiki lint only when deterministic auto-fix is requested', () => {
	expect(wikiLintTool).toMatchObject({
		risk: 'high',
		effect: 'persistence',
		allowedOrigins: ['main'],
	});
	expect(typeof wikiLintTool.hardApproval).toBe('function');
	if (typeof wikiLintTool.hardApproval !== 'function') throw new Error('Expected dynamic approval');
	expect(wikiLintTool.hardApproval({ autoFix: true })).toBe(true);
	expect(wikiLintTool.hardApproval({ autoFix: false })).toBe(false);
});
