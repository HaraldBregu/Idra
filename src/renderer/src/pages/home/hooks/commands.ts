const TASK_COMMANDS: Record<string, (rest: string) => string> = {
	'/task_list': () => 'List all my tasks.',
	'/create_task': (rest) =>
		rest
			? `Create a new task: ${rest}`
			: 'I want to create a new task. Ask me what the task should be.',
	'/delete_task': (rest) =>
		rest
			? `Delete this task: ${rest}`
			: 'I want to delete a task. List my tasks and ask me which one to delete.',
};

export function expandTaskCommand(prompt: string): string {
	const match = /^(\/\w+)\s*([\s\S]*)$/.exec(prompt);
	if (!match) return prompt;
	const expand = TASK_COMMANDS[match[1].toLowerCase()];
	return expand ? expand(match[2].trim()) : prompt;
}
