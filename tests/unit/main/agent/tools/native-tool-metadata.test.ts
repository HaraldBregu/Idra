import { completeBootstrapTool } from '../../../../../src/main/agent/tools/assistant/bootstrap_complete';
import { editTool } from '../../../../../src/main/agent/tools/core/edit';
import { updateHealthSettingsTool } from '../../../../../src/main/agent/tools/health/settings_update';
import { updateHealthTool } from '../../../../../src/main/agent/tools/health/update';
import { createImageTool } from '../../../../../src/main/agent/tools/media/image_create';
import { createSoundTool } from '../../../../../src/main/agent/tools/media/sound_create';
import { createVideoTool } from '../../../../../src/main/agent/tools/media/video_create';
import { forgetMemoryTool } from '../../../../../src/main/agent/tools/memory/forget';
import { saveMemoryTool } from '../../../../../src/main/agent/tools/memory/save';
import { recorderCameraTool } from '../../../../../src/main/agent/tools/os/recorder_camera';
import { recorderMicrophoneTool } from '../../../../../src/main/agent/tools/os/recorder_microphone';
import { recorderScreenTool } from '../../../../../src/main/agent/tools/os/recorder_screen';
import { createScheduleTool } from '../../../../../src/main/agent/tools/tasks/create_schedule';
import { deleteScheduleTool } from '../../../../../src/main/agent/tools/tasks/delete_schedule';
import { pauseScheduleTool } from '../../../../../src/main/agent/tools/tasks/pause_schedule';
import { resumeScheduleTool } from '../../../../../src/main/agent/tools/tasks/resume_schedule';
import { runScheduleNowTool } from '../../../../../src/main/agent/tools/tasks/run_schedule_now';
import { updateScheduleTool } from '../../../../../src/main/agent/tools/tasks/update_schedule';
import { wikiIngestTool } from '../../../../../src/main/agent/tools/knowledge/ingest';
import { wikiLintTool } from '../../../../../src/main/agent/tools/knowledge/lint';
import { wikiReadTool } from '../../../../../src/main/agent/tools/knowledge/read';
import { wikiRebuildTool } from '../../../../../src/main/agent/tools/knowledge/rebuild';
import { wikiReviewTool } from '../../../../../src/main/agent/tools/knowledge/review';
import { wikiSaveTool } from '../../../../../src/main/agent/tools/knowledge/save';
import { wikiSearchTool } from '../../../../../src/main/agent/tools/knowledge/search';
import { wikiQueryTool } from '../../../../../src/main/agent/tools/knowledge/wiki';
import { knowledgeSearchTool } from '../../../../../src/main/agent/tools/knowledge/rag';
import { webBrowserTool } from '../../../../../src/main/agent/tools/web/browser';

it.each([
	updateHealthTool({ location: '/workspace' }),
	updateHealthSettingsTool,
	completeBootstrapTool,
	wikiIngestTool,
	wikiSaveTool,
	wikiLintTool,
	wikiReviewTool,
	wikiRebuildTool,
	createImageTool(),
	createVideoTool(),
	createSoundTool(),
	recorderMicrophoneTool(),
	recorderCameraTool(),
	recorderScreenTool(),
	saveMemoryTool({ location: '/workspace' }),
	forgetMemoryTool({ location: '/workspace' }),
	webBrowserTool,
])('%s uses policy permission without forced approval', (tool) => {
	expect(tool.hardApproval).toBeUndefined();
	expect(tool.alwaysAsk).toBeUndefined();
});

it.each([knowledgeSearchTool, wikiSearchTool, wikiReadTool, wikiQueryTool])(
	'%s has an allow fallback before runtime registration',
	(tool) => {
		expect(tool.defaultPermission).toBe('allow');
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

it('allows wiki lint to use its ordinary policy', () => {
	expect(wikiLintTool).toMatchObject({
		defaultPermission: 'allow',
		risk: 'high',
		effect: 'persistence',
		allowedOrigins: ['main'],
	});
	expect(wikiLintTool.hardApproval).toBeUndefined();
});
