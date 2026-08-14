import type { AgentMediaModelKind } from '../shared/agent_types';
import {
	getMediaModel,
	getModelId as getAgentModelId,
	getProviderId as getAgentProviderId,
	setMediaModel,
	setModelId as setAgentModelId,
	setProviderId as setAgentProviderId,
} from '../agent/agent_store';
import { getRagConfiguration, saveRagConfiguration } from '../agent/knowledge/rag/rag_store';

export type ModelKind =
	| 'text'
	| 'sound'
	| 'image'
	| 'video'
	| 'voice'
	| 'realtimeVoice'
	| 'transcribe'
	| 'realtime'
	| 'embedding';

export type MediaModelKind = 'image' | 'sound' | 'video' | 'voice' | 'realtimeVoice';

type ModelSelection = {
	providerId: string;
	modelId: string;
};

type AgentModelKind = Exclude<ModelKind, 'text' | 'embedding'>;

const AGENT_MODEL_KINDS: Record<AgentModelKind, AgentMediaModelKind> = {
	sound: 'audio',
	image: 'image',
	video: 'video',
	voice: 'voice',
	realtimeVoice: 'realtimeVoice',
	transcribe: 'transcription',
	realtime: 'transcription',
};

export function getProviderId(kind: ModelKind): string | undefined {
	return optionalTrimmedString(selection(kind).providerId);
}

export function setProviderId(kind: ModelKind, providerId: string): void {
	if (kind === 'text') {
		setAgentProviderId(providerId);
		return;
	}
	setSelection(kind, providerId, selection(kind).modelId);
}

export function getModelId(kind: ModelKind): string | undefined {
	return optionalTrimmedString(selection(kind).modelId);
}

export function setModelId(kind: ModelKind, modelId: string): void {
	if (kind === 'text') {
		setAgentModelId(modelId);
		return;
	}
	setSelection(kind, selection(kind).providerId, modelId);
}

export function setSelection(kind: ModelKind, providerId: string, modelId: string): void {
	if (kind === 'text') {
		setAgentProviderId(providerId);
		setAgentModelId(modelId);
		return;
	}
	if (kind === 'embedding') {
		saveRagConfiguration({
			...getRagConfiguration(),
			embeddingProviderId: providerId,
			embeddingModelId: modelId,
		});
		return;
	}
	const agentKind = AGENT_MODEL_KINDS[kind];
	const current = getMediaModel(agentKind);
	setMediaModel(agentKind, {
		providerId,
		modelId,
		options:
			current.providerId === providerId && current.modelId === modelId ? current.options : {},
	});
}

export function getOptions(kind: MediaModelKind): Record<string, unknown> {
	return getMediaModel(AGENT_MODEL_KINDS[kind]).options;
}

export function setOptions(kind: MediaModelKind, options: Record<string, unknown>): void {
	const agentKind = AGENT_MODEL_KINDS[kind];
	setMediaModel(agentKind, { ...getMediaModel(agentKind), options });
}

export function resolveOptions(
	kind: MediaModelKind,
	providerId: string,
	modelId: string,
	overrides?: Record<string, unknown>
): Record<string, unknown> | undefined {
	const configured = getMediaModel(AGENT_MODEL_KINDS[kind]);
	const defaults =
		configured.providerId === providerId && configured.modelId === modelId
			? configured.options
			: {};
	const resolved = { ...defaults, ...overrides };
	return Object.keys(resolved).length > 0 ? resolved : undefined;
}

function selection(kind: ModelKind): ModelSelection {
	if (kind === 'text') {
		return {
			providerId: getAgentProviderId() ?? '',
			modelId: getAgentModelId() ?? '',
		};
	}
	if (kind === 'embedding') {
		const configuration = getRagConfiguration();
		return {
			providerId: configuration.embeddingProviderId,
			modelId: configuration.embeddingModelId,
		};
	}
	const configured = getMediaModel(AGENT_MODEL_KINDS[kind]);
	return { providerId: configured.providerId, modelId: configured.modelId };
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
