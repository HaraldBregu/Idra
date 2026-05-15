import type { TaskManagerService } from '../manager/task-manager';

export async function runAgentWorkflowExample(tasks: TaskManagerService): Promise<string> {
	const workflow = await tasks.createWorkflow({ title: 'Agent workflow example' });
	const agentTask = await tasks.createTask({
		type: 'ai.agent.run',
		title: 'Run agent',
		source: 'agent',
		workflowId: workflow.workflowId,
		input: { prompt: 'Plan and execute a skill' },
		autoStart: true,
	});
	const skillTask = await tasks.createTask({
		type: 'skill.execute',
		title: 'Execute selected skill',
		source: 'skill',
		parentTaskId: agentTask.id,
		workflowId: workflow.workflowId,
		dependencies: [{ taskId: agentTask.id, type: 'succeedsBefore' }],
		input: { skillId: 'summarize-document' },
		autoStart: true,
	});
	await tasks.createTask({
		type: 'tool.execute',
		title: 'Run child tool',
		source: 'tool',
		parentTaskId: skillTask.id,
		workflowId: workflow.workflowId,
		dependencies: [{ taskId: skillTask.id, type: 'succeedsBefore' }],
		input: { toolName: 'read' },
		autoStart: true,
	});
	return workflow.workflowId;
}
