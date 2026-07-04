import type { Agent } from '../agent';
import { HEALTH_FILE, readTextFile, workspacePath } from '../system';
import { getHealthSettings } from './health_store';
import type { HealthActiveHours } from './health_types';

const HEALTH_AGENT_ID = 'health';
const HEALTH_SESSION_ID = 'health';
const HEALTH_OK = 'HEALTH_OK';

const HEALTH_PROMPT_HEADER = [
	'[HEALTH CHECK] This is an automated background health check, not a user message.',
	'Follow the HEALTH.md checklist below. Do not invent tasks that are not listed.',
	`If nothing needs attention, reply with exactly ${HEALTH_OK} and nothing else.`,
].join('\n');

export async function runHealthCheck(agent: Agent): Promise<void> {
	const settings = getHealthSettings();
	if (settings.skipWhenBusy && (agent.isBusy('main') || agent.isBusy(HEALTH_AGENT_ID))) return;
	if (!withinActiveHours(settings.activeHours)) return;

	const checklist = await readTextFile(workspacePath(agent.config), HEALTH_FILE);
	if (!hasChecklistItems(checklist)) return;

	const message = `${HEALTH_PROMPT_HEADER}\n\n${checklist.trim()}`;
	const response = await agent.send(
		message,
		HEALTH_AGENT_ID,
		settings.isolatedSession ? { sessionId: HEALTH_SESSION_ID } : {}
	);
	if (response.trim() === HEALTH_OK) return;
	console.info('[Health]', response);
}

function hasChecklistItems(text: string): boolean {
	return text.split('\n').some((line) => {
		const trimmed = line.trim();
		return Boolean(trimmed) && !trimmed.startsWith('#');
	});
}

function withinActiveHours(hours?: HealthActiveHours): boolean {
	const start = parseMinutes(hours?.start);
	const end = parseMinutes(hours?.end);
	if (start === undefined || end === undefined || start === end) return true;
	const now = new Date();
	const minutes = now.getHours() * 60 + now.getMinutes();
	return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function parseMinutes(value?: string): number | undefined {
	const match = value?.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return undefined;
	return Number(match[1]) * 60 + Number(match[2]);
}
