export type ProviderModelStatus = 'active' | 'deprecated' | 'verify';

export type SpeechToTextApiType = 'batch' | 'stream';

export type ModelCapability =
	| 'llm'
	| 'research-chat'
	| 'speech-to-text'
	| 'text-to-speech'
	| 'realtime-voice'
	| 'text-to-image'
	| 'text-to-video'
	| 'text-to-audio'
	| 'embedding';

export interface ProviderModel {
	readonly id: string;
	readonly name: string;
	readonly status: ProviderModelStatus;
	/** Speech-to-text only: transcription APIs this model supports. */
	readonly apiTypes?: readonly SpeechToTextApiType[];
	/** Speech-to-text only: model streams transcripts in realtime. */
	readonly realtime?: boolean;
}

export type ModelCatalog = Readonly<Record<string, readonly ProviderModel[]>>;

export function cloneModels(models: readonly ProviderModel[] | undefined): ProviderModel[] {
	return (models ?? []).map((model) => ({ ...model }));
}
