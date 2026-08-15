import path from 'node:path';
import { agentLocation } from '../shared/agent_location';
import { userDataLocation } from '../shared/user_data_location';
import { readProvider } from '../provider/read';

export const AGENT_DIRECTORY = path.resolve(agentLocation());

export function getProviderId(): string | undefined {
	return (
		readProvider(userDataLocation())?.provider ?? process.env.IDRA_PROVIDER_ID?.trim() ?? undefined
	);
}

export function getModelId(): string | undefined {
	return readProvider(userDataLocation())?.model ?? process.env.IDRA_MODEL_ID?.trim() ?? undefined;
}

export function getModelOptions(): Record<string, unknown> {
	const value = process.env.IDRA_MODEL_OPTIONS?.trim();
	if (!value) return {};
	const parsed = JSON.parse(value) as unknown;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('IDRA_MODEL_OPTIONS must be a JSON object.');
	}
	return parsed as Record<string, unknown>;
}
