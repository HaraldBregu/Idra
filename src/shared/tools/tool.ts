import type { AgentToolMetadata } from './types';

export function tool<TName extends string>(metadata: AgentToolMetadata & { name: TName }) {
	return metadata;
}
