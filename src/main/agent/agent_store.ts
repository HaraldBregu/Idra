import path from 'node:path';
import { agentLocation } from '../shared/agent_location';
import { configuredProvider } from '../config/provider';

export const AGENT_DIRECTORY = path.resolve(agentLocation());

export function getProviderId(): string | undefined {
	return configuredProvider()?.provider;
}

export function getModelId(): string | undefined {
	return configuredProvider()?.model;
}

export function getModelOptions(): Record<string, unknown> {
	return {};
}
