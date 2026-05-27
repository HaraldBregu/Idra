import { AGENT_TOOL_METADATA_BY_NAME, type AgentToolName } from '../../../shared/tools';

export function toolDescription(name: AgentToolName): string {
	return AGENT_TOOL_METADATA_BY_NAME[name]?.description ?? name;
}

export function toolTitle(name: AgentToolName): string {
	return AGENT_TOOL_METADATA_BY_NAME[name]?.title ?? name;
}
