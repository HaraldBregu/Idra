import { completeBootstrapTool } from '../../../../../src/main/agent/tools/assistant/bootstrap_complete';
import { editTool } from '../../../../../src/main/agent/tools/core/edit';
import { updateHealthSettingsTool } from '../../../../../src/main/agent/tools/health/settings_update';
import { updateHealthTool } from '../../../../../src/main/agent/tools/health/update';
import { pauseScheduleTool } from '../../../../../src/main/agent/tools/tasks/pause_schedule';
import { wikiIngestTool } from '../../../../../src/main/agent/tools/knowledge/ingest';
import { wikiLintTool } from '../../../../../src/main/agent/tools/knowledge/lint';
import { wikiRebuildTool } from '../../../../../src/main/agent/tools/knowledge/rebuild';
import { wikiReviewTool } from '../../../../../src/main/agent/tools/knowledge/review';
import { wikiSaveTool } from '../../../../../src/main/agent/tools/knowledge/save';

it.each([
	[pauseScheduleTool, 'high', 'persistence', ['main']],
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
