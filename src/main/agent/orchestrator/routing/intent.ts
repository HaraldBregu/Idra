import type { AgentCapabilityDecisionMode } from '../../../../shared/agents/capabilities';
import type { AgentTool } from '../../capabilities/local';

export interface AgentIntentRoute {
	mode: AgentCapabilityDecisionMode;
	reason: string;
	useLocalTools: boolean;
	useConnectorTools: boolean;
}

const LOCAL_READ_RE = /\b(read|list|show|open|find|search|grep|inspect|check|analyze|review|diff|status)\b/i;
const LOCAL_WRITE_RE = /\b(create|write|update|edit|change|modify|delete|remove|move|rename|copy|patch|fix|implement|save)\b/i;
const LOCAL_CONTEXT_RE = /\b(file|files|folder|folders|directory|directories|path|workspace|repo|repository|project|code|implementation|diff|todo|task|cron|schedule|reminder)\b/i;
const CONNECTOR_RE = /\b(mcp|connector|github|gitlab|jira|linear|slack|discord|notion|calendar|gmail|email|drive|figma|database|issue|issues|pull request|pr)\b/i;
const CONNECTOR_ACTION_RE = /\b(read|list|show|find|search|get|fetch|create|write|update|edit|comment|post|send|open|close|assign|schedule)\b/i;
const STARTUP_FILES_RE = /\b(call me|my name|your name|remember|forget|identity|soul|bootstrap|startup|system prompt|memory)\b/i;

export function resolveAgentIntentRoute(message: string): AgentIntentRoute {
	const text = message.trim();
	if (!text) {
		return {
			mode: 'direct_answer',
			reason: 'Empty prompt; no tools or skills needed.',
			useLocalTools: false,
			useConnectorTools: false,
		};
	}

	const useConnectorTools = CONNECTOR_RE.test(text) && CONNECTOR_ACTION_RE.test(text);
	const useLocalTools = LOCAL_CONTEXT_RE.test(text) && (LOCAL_READ_RE.test(text) || LOCAL_WRITE_RE.test(text));
	const mode = useLocalTools || useConnectorTools ? 'use_tools' : 'direct_answer';
	return {
		mode,
		reason: mode === 'direct_answer'
			? 'The prompt can be answered by the LLM without exposing tools.'
			: 'The prompt asks for workspace or remote-context work, so tools are exposed.',
		useLocalTools,
		useConnectorTools,
	};
}

export function selectLocalToolsForIntent(tools: AgentTool[], route: AgentIntentRoute): AgentTool[] {
	if (!route.useLocalTools) return [];
	return tools;
}

export function shouldExposeStartupFilesTool(message: string): boolean {
	return STARTUP_FILES_RE.test(message);
}
