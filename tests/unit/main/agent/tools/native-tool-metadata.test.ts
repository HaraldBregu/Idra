import { completeBootstrapTool } from '../../../../../src/main/agent/tools/assistant/bootstrap_complete';
import { editTool } from '../../../../../src/main/agent/tools/core/edit_file';
import { updateHealthSettingsTool } from '../../../../../src/main/agent/tools/health/settings_update';
import { updateHealthTool } from '../../../../../src/main/agent/tools/health/update';
import { createImageTool } from '../../../../../src/main/agent/tools/media/image_create';
import { createSoundTool } from '../../../../../src/main/agent/tools/media/sound_create';
import { createVideoTool } from '../../../../../src/main/agent/tools/media/video_create';
import { forgetMemoryTool } from '../../../../../src/main/agent/tools/memory/forget';
import { saveMemoryTool } from '../../../../../src/main/agent/tools/memory/save';
import { cameraRecorderTool } from '../../../../../src/main/agent/tools/system/camera_recorder';
import { microphoneRecorderTool } from '../../../../../src/main/agent/tools/system/microphone_recorder';
import { screenRecorderTool } from '../../../../../src/main/agent/tools/system/screen_recorder';
import { createTaskTool } from '../../../../../src/main/agent/tools/tasks/create_task';
import { deleteTaskTool } from '../../../../../src/main/agent/tools/tasks/delete_task';
import { getTaskTool } from '../../../../../src/main/agent/tools/tasks/get_task';
import { listTasksTool } from '../../../../../src/main/agent/tools/tasks/list_tasks';
import { pauseTaskTool } from '../../../../../src/main/agent/tools/tasks/pause_task';
import { resumeTaskTool } from '../../../../../src/main/agent/tools/tasks/resume_task';
import { runTaskNowTool } from '../../../../../src/main/agent/tools/tasks/run_task_now';
import { updateTaskTool } from '../../../../../src/main/agent/tools/tasks/update_task';
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
	microphoneRecorderTool(),
	cameraRecorderTool(),
	screenRecorderTool(),
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
	createTaskTool,
	updateTaskTool,
	deleteTaskTool,
	pauseTaskTool,
	resumeTaskTool,
	runTaskNowTool,
])('%s uses its scoped permission without forced approval', (tool) => {
	expect(tool.defaultPermission).toBe('allow');
	expect(tool.hardApproval).not.toBe(true);
	expect(tool.allowedOrigins).toBeUndefined();
});

it.each([
	['create_task', createTaskTool],
	['update_task', updateTaskTool],
	['delete_task', deleteTaskTool],
	['get_task', getTaskTool],
	['list_tasks', listTasksTool],
	['pause_task', pauseTaskTool],
	['resume_task', resumeTaskTool],
	['run_task_now', runTaskNowTool],
] as const)('exports the %s tool from its matching module', (name, taskTool) => {
	expect(taskTool.name).toBe(name);
});

it('uses taskId in task tool inputs', () => {
	expect(deleteTaskTool.parseInput({ taskId: 'task-1' })).toEqual({ taskId: 'task-1' });
	expect(() => deleteTaskTool.parseInput({ scheduleId: 'task-1' })).toThrow();
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
