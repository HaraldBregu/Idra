import { AGENT_TOOL_METADATA_BY_NAME } from '../../../../shared/tools';

export function toolDescription(name: string): string {
	return (
		(AGENT_TOOL_METADATA_BY_NAME as Record<string, { description?: string }>)[name]?.description ??
		name
	);
}

export function toolTitle(name: string): string {
	return (AGENT_TOOL_METADATA_BY_NAME as Record<string, { title?: string }>)[name]?.title ?? name;
}
