import type { AgentToolPart } from './tool-parts';

const EXECUTE_SKILL_TOOL_NAME = 'execute_skill';

export interface AgentSkillUsage {
	readonly id: string;
	readonly version?: string;
	readonly label: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSkillKey(value: unknown): AgentSkillUsage | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const atIndex = trimmed.lastIndexOf('@');
	if (atIndex > 0 && atIndex < trimmed.length - 1) {
		const id = trimmed.slice(0, atIndex);
		const version = trimmed.slice(atIndex + 1);
		return { id, version, label: `${id}@${version}` };
	}
	return { id: trimmed, label: trimmed };
}

function parseJsonObject(value: string | undefined): Record<string, unknown> | undefined {
	if (!value?.trim()) return undefined;
	try {
		const parsed = JSON.parse(value);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function addUsage(
	items: AgentSkillUsage[],
	seen: Set<string>,
	usage: AgentSkillUsage | undefined
): void {
	if (!usage) return;
	const key = usage.version ? `${usage.id}@${usage.version}` : usage.id;
	if (seen.has(key)) return;
	seen.add(key);
	items.push(usage);
}

function collectFromResultPayload(
	items: AgentSkillUsage[],
	seen: Set<string>,
	payload: unknown
): void {
	if (!isRecord(payload)) return;
	const usedSkills = Array.isArray(payload.usedSkills) ? payload.usedSkills : [];
	for (const usedSkill of usedSkills) {
		addUsage(items, seen, parseSkillKey(usedSkill));
	}
}

export function getAgentSkillUsages(tools: readonly AgentToolPart[]): AgentSkillUsage[] {
	const items: AgentSkillUsage[] = [];
	const seen = new Set<string>();

	for (const tool of tools) {
		if (tool.type !== EXECUTE_SKILL_TOOL_NAME) continue;

		if (isRecord(tool.input)) {
			const skillId = parseSkillKey(tool.input.skillId);
			const version = typeof tool.input.version === 'string' ? tool.input.version.trim() : '';
			addUsage(
				items,
				seen,
				skillId && version
					? { id: skillId.id, version, label: `${skillId.id}@${version}` }
					: skillId
			);
		}

		collectFromResultPayload(items, seen, tool.output);
		collectFromResultPayload(items, seen, parseJsonObject(tool.outputText));
	}

	return items;
}
