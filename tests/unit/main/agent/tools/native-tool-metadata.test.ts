import { completeBootstrapTool } from '../../../../../src/main/agent/tools/bootstrap_complete';
import { editTool } from '../../../../../src/main/agent/tools/file/edit';
import { updateHealthSettingsTool } from '../../../../../src/main/agent/tools/health_settings_update';
import { updateHealthTool } from '../../../../../src/main/agent/tools/health_update';
import { pauseScheduleTool } from '../../../../../src/main/agent/tools/tasks/pause_schedule';
import { wikiIngestTool } from '../../../../../src/main/agent/tools/wiki/ingest';
import { wikiLintTool } from '../../../../../src/main/agent/tools/wiki/lint';
import { wikiRebuildTool } from '../../../../../src/main/agent/tools/wiki/rebuild';
import { wikiReviewTool } from '../../../../../src/main/agent/tools/wiki/review';
import { wikiSaveTool } from '../../../../../src/main/agent/tools/wiki/save';

it.each([
	[editTool, 'high', 'write', ['main', 'task', 'subagent']],
	[pauseScheduleTool, 'high', 'persistence', ['main']],
	[updateHealthTool({ location: '/workspace' }), 'high', 'persistence', ['main']],
	[updateHealthSettingsTool, 'high', 'persistence', ['main']],
	[completeBootstrapTool, 'critical', 'persistence', ['main']],
	[wikiIngestTool, 'high', 'persistence', ['main']],
	[wikiSaveTool, 'high', 'persistence', ['main']],
	[wikiReviewTool, 'critical', 'persistence', ['main']],
	[wikiRebuildTool, 'high', 'persistence', ['main']],
] as const)('%s cannot mutate persistently through trusted-main bypass', (tool, risk, effect, origins) => {
	expect(tool).toMatchObject({ risk, effect, hardApproval: true, allowedOrigins: origins });
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
