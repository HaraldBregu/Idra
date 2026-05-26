import { filterTools, type PolicyConfig } from '../policy';
import type { AgentTool } from '../core/types';
import { LOCAL_TOOL_CATALOG } from './catalog';

export {
	LOCAL_TOOL_CATALOG,
	localToolCatalogByName,
	localToolNamesForGroup,
	localToolNamesForProfile,
	type LocalToolApprovalPolicy,
	type LocalToolCatalogEntry,
	type LocalToolGroup,
	type LocalToolProfile,
} from './catalog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRELOADED_LOCAL_TOOLS: AgentTool<any, any>[] = LOCAL_TOOL_CATALOG.map(
	(entry) => entry.tool
);

export const ALL_TOOLS = PRELOADED_LOCAL_TOOLS;

export function createTools(cfg: PolicyConfig): AgentTool[] {
	return filterTools(PRELOADED_LOCAL_TOOLS as unknown as AgentTool[], cfg);
}
