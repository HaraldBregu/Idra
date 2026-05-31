import { AGENT_TOOL_METADATA_BY_NAME } from '../../../shared/tools';

export function toolDescription(name: string): string {
	return AGENT_TOOL_METADATA_BY_NAME[name]?.description ?? name;
}

export function toolTitle(name: string): string {
	return AGENT_TOOL_METADATA_BY_NAME[name]?.title ?? name;
}
