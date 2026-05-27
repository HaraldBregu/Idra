import { AGENT_TOOLS, type AgentToolName } from '../../../../shared/tools';

const METADATA_BY_NAME = new Map(AGENT_TOOLS.map((tool) => [tool.name, tool]));

export function toolDescription(name: AgentToolName): string {
	return METADATA_BY_NAME.get(name)?.description ?? name;
}

export function toolTitle(name: AgentToolName): string {
	return METADATA_BY_NAME.get(name)?.title ?? name;
}
