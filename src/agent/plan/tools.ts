import type { AgentInteractionMode } from '../../shared/agent_types';
import type { Tool } from '../types';

export function filterPlanTools(tools: Tool[], mode: AgentInteractionMode): Tool[] {
	return mode === 'plan' ? tools.filter((tool) => tool.planSafe === true) : tools;
}
