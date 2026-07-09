import i18n from '@/i18n';

const TASK_COMMANDS: Record<string, (rest: string) => string> = {
	'/task_list': () => i18n.t('taskCommands.list'),
	'/create_task': (rest) =>
		rest
			? i18n.t('taskCommands.create', { message: rest })
			: i18n.t('taskCommands.createEmpty'),
	'/delete_task': (rest) =>
		rest
			? i18n.t('taskCommands.delete', { message: rest })
			: i18n.t('taskCommands.deleteEmpty'),
};

export function expandTaskCommand(prompt: string): string {
	const match = /^(\/\w+)\s*([\s\S]*)$/.exec(prompt);
	if (!match) return prompt;
	const expand = TASK_COMMANDS[match[1].toLowerCase()];
	return expand ? expand(match[2].trim()) : prompt;
}
