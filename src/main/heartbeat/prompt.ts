import { HEARTBEAT_OK } from '../../shared/heartbeat';
import { parseHeartbeatDurationMs } from './duration';

export interface HeartbeatTask {
	name: string;
	interval: string;
	prompt: string;
}

const MAX_EVENT_PROMPT_CHARS = 8_000;
const STRUCTURED_EXEC_COMPLETION_EVENT_RE =
	/^exec (completed|failed) \(([a-z0-9_-]{1,64}), (code -?\d+|signal [^)]+)\)(?: :: ([\s\S]*))?$/i;

const EMPTY_TEMPLATE_LINES = new Set([
	'keep this file empty or comment-only to skip proactive work.',
	'add short checklist items here when friday should periodically check something.',
	'if nothing is noteworthy during a heartbeat run, respond exactly:',
	HEARTBEAT_OK.toLowerCase(),
]);

export function isHeartbeatContentEffectivelyEmpty(content: string | undefined | null): boolean {
	if (content == null) return false;
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		const lower = trimmed.toLowerCase();
		if (!trimmed) continue;
		if (/^#+(\s|$)/.test(trimmed)) continue;
		if (/^[-*+]\s*(\[[\sXx]?\]\s*)?$/.test(trimmed)) continue;
		if (/^```[A-Za-z0-9_-]*$/.test(trimmed)) continue;
		if (/^<!--.*-->$/.test(trimmed)) continue;
		if (/^(\/\/|#\s?comment:)/i.test(trimmed)) continue;
		if (EMPTY_TEMPLATE_LINES.has(lower)) continue;
		return false;
	}
	return true;
}

export function parseHeartbeatTasks(content: string): HeartbeatTask[] {
	const tasks: HeartbeatTask[] = [];
	const lines = content.split('\n');
	let inTasksBlock = false;

	for (let idx = 0; idx < lines.length; idx++) {
		const line = lines[idx] ?? '';
		const trimmed = line.trim();
		if (trimmed === 'tasks:') {
			inTasksBlock = true;
			continue;
		}
		if (!inTasksBlock) continue;
		if (
			trimmed &&
			!trimmed.startsWith('-') &&
			!line.startsWith(' ') &&
			!line.startsWith('\t')
		) {
			inTasksBlock = false;
			continue;
		}
		if (!trimmed.startsWith('- name:')) continue;

		const name = unquote(trimmed.slice('- name:'.length).trim());
		let interval = '';
		let prompt = '';
		for (let lookahead = idx + 1; lookahead < lines.length; lookahead++) {
			const nextLine = lines[lookahead] ?? '';
			const next = nextLine.trim();
			if (next.startsWith('- name:')) break;
			if (next && !nextLine.startsWith(' ') && !nextLine.startsWith('\t')) break;
			if (next.startsWith('interval:')) interval = unquote(next.slice('interval:'.length).trim());
			if (next.startsWith('prompt:')) prompt = unquote(next.slice('prompt:'.length).trim());
		}
		if (name && interval && prompt) tasks.push({ name, interval, prompt });
	}

	return tasks;
}

export function stripHeartbeatTasksBlock(content: string): string {
	const lines = content.split('\n');
	const kept: string[] = [];
	let inTasksBlock = false;
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed === 'tasks:') {
			inTasksBlock = true;
			continue;
		}
		if (inTasksBlock) {
			if (
				trimmed &&
				!trimmed.startsWith('-') &&
				!line.startsWith(' ') &&
				!line.startsWith('\t')
			) {
				inTasksBlock = false;
				kept.push(line);
			}
			continue;
		}
		kept.push(line);
	}
	return kept.join('\n').trim();
}

export function isHeartbeatTaskDue(lastRunMs: number | undefined, interval: string, nowMs: number): boolean {
	if (lastRunMs === undefined) return true;
	const intervalMs = parseHeartbeatDurationMs(interval, 'm');
	return intervalMs !== null && nowMs - lastRunMs >= intervalMs;
}

export function isExecCompletionEvent(eventText: string): boolean {
	const trimmed = eventText.trimStart();
	return /^exec finished(?::|\s*\()/i.test(trimmed) || STRUCTURED_EXEC_COMPLETION_EVENT_RE.test(trimmed);
}

export function isCronSystemEvent(eventText: string): boolean {
	const trimmed = eventText.trim();
	if (!trimmed) return false;
	const lower = trimmed.toLowerCase();
	if (lower.startsWith(HEARTBEAT_OK.toLowerCase())) return false;
	if (lower.includes('heartbeat poll') || lower.includes('heartbeat wake')) return false;
	return !isExecCompletionEvent(trimmed);
}

export function buildExecEventPrompt(events: string[], deliverToUser: boolean): string {
	const eventText = truncate(events.map(formatExecEvent).filter(Boolean).join('\n').trim(), MAX_EVENT_PROMPT_CHARS);
	if (!eventText) {
		return `An async command completion event was triggered, but no command output was found. Reply ${HEARTBEAT_OK} only. Do not mention, summarize, or reuse output from any earlier run.`;
	}
	if (!deliverToUser) {
		return `An async command completion event was triggered, but user delivery is disabled for this run. Handle the result internally and reply ${HEARTBEAT_OK} only. Do not mention, summarize, or reuse command output.`;
	}
	return [
		'An async command you ran earlier has completed. The command completion details are:',
		'',
		eventText,
		'',
		'Please relay the command output to the user in a helpful way. If the command succeeded, share the relevant output. If it failed, explain what went wrong.',
	].join('\n');
}

export function buildCronEventPrompt(events: string[], deliverToUser: boolean): string {
	const eventText = events.join('\n').trim();
	if (!eventText) return `A scheduled cron event was triggered, but no event content was found. Reply ${HEARTBEAT_OK}.`;
	if (!deliverToUser) {
		return [
			'A scheduled reminder has been triggered. The reminder content is:',
			'',
			eventText,
			'',
			'Handle this reminder internally. Do not relay it to the user unless explicitly requested.',
		].join('\n');
	}
	return [
		'A scheduled reminder has been triggered. The reminder content is:',
		'',
		eventText,
		'',
		'Please relay this reminder to the user in a helpful and friendly way.',
	].join('\n');
}

export function buildHeartbeatPrompt(input: {
	basePrompt: string;
	heartbeatPath?: string;
	heartbeatContent?: string;
	dueTasks?: HeartbeatTask[];
	execEvents?: string[];
	cronEvents?: string[];
	deliverToUser: boolean;
	useResponseTool: boolean;
	now?: Date;
}): string {
	const parts: string[] = [];
	if (input.execEvents?.length) {
		parts.push(buildExecEventPrompt(input.execEvents, input.deliverToUser));
	} else if (input.cronEvents?.length) {
		parts.push(buildCronEventPrompt(input.cronEvents, input.deliverToUser));
	} else if (input.dueTasks?.length) {
		parts.push(
			[
				input.basePrompt,
				'',
				'Only these HEARTBEAT.md tasks are due now:',
				...input.dueTasks.map((task) => `- ${task.name} (${task.interval}): ${task.prompt}`),
			].join('\n')
		);
	} else {
		parts.push(input.basePrompt);
	}

	const prose = input.heartbeatContent ? stripHeartbeatTasksBlock(input.heartbeatContent) : '';
	if (prose) parts.push(['Additional HEARTBEAT.md context:', prose].join('\n\n'));
	if (input.heartbeatPath && input.basePrompt.includes('HEARTBEAT.md')) {
		parts.push(`HEARTBEAT.md path: ${input.heartbeatPath}`);
	}
	if (input.useResponseTool) {
		parts.push(
			'Use heartbeat_respond to report the outcome. Set notify=false when nothing should interrupt the user. Set notify=true only for user-relevant alerts.'
		);
	}
	const now = input.now ?? new Date();
	parts.push(`Current time: ${now.toISOString()}`);
	return parts.map((part) => part.trim()).filter(Boolean).join('\n\n');
}

function unquote(value: string): string {
	return value.replace(/^["']|["']$/g, '').trim();
}

function truncate(value: string, maxChars: number): string {
	return value.length <= maxChars ? value : `${value.slice(0, maxChars)}\n\n[truncated]`;
}

function formatExecEvent(eventText: string): string {
	const trimmed = eventText.trim();
	const match = STRUCTURED_EXEC_COMPLETION_EVENT_RE.exec(trimmed);
	if (!match) return trimmed;
	const action = match[1] ?? '';
	const id = match[2] ?? '';
	const result = match[3] ?? '';
	const output = (match[4] ?? '').trim();
	if (output) return trimmed;
	if (action.toLowerCase() === 'completed' && result.toLowerCase() === 'code 0') return '';
	return `Exec ${action} (${id}, ${result}) without captured stdout/stderr.`;
}
