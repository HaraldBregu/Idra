import type { AgentToolProfile } from './types';

export const AGENT_TOOL_PROFILES = ['minimal', 'coding', 'messaging', 'standard', 'full'] as const;
export const AGENT_TOOL_STANDARD_PROFILES = ['coding', 'standard', 'full'] as const;

export const DEFAULT_TOOL_PROFILES = AGENT_TOOL_STANDARD_PROFILES;
export const OPTIONAL_TOOL_PROFILES = ['full'] as const satisfies readonly AgentToolProfile[];
export const LEGACY_TOOL_PROFILES = DEFAULT_TOOL_PROFILES;
