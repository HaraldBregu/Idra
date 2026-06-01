import type { AgentsHeartbeatConfig } from '../heartbeat';
import type { Provider } from '../providers';
import { IMAGE_CREATOR_MODELS, SPEECH_TO_TEXT_MODELS, TEXT_TO_VIDEO_MODELS } from '../providers';
import type { Model } from './reasoning';

export type OperatorStatus = 'implemented' | 'placeholder' | 'pending-runtime';

export interface OperatorBase {
	id: string;
	name: string;
	docsPath: string;
	status: OperatorStatus;
}

export interface ModelOperator extends OperatorBase {
	provider?: Omit<Provider, 'apiKey'>;
	model?: Model;
}

export interface ModelOperatorSelection {
	provider: Omit<Provider, 'apiKey'>;
	model: Model;
}

export type ConfiguredModelOperator = ModelOperator & ModelOperatorSelection;

export interface EndpointOperator extends OperatorBase {
	endpoint: string;
}

export interface SchedulerOperator extends OperatorBase {}

export interface TaskOperator extends OperatorBase {
	registeredTaskTypes: string[];
}

/** @deprecated Use ConfiguredModelOperator for operator settings selections. */
export type Agent = ModelOperatorSelection;

export const ASSISTANT_OPERATOR_ID = 'friday';
export const ASSISTANT_RUNTIME_ID = 'main';
export const SPEECH_TO_TEXT_OPERATOR_ID = 'speech-to-text';
export const REALTIME_TRANSCRIPTION_SAMPLE_RATE = 24000;
export const TEXT_TO_SPEECH_OPERATOR_ID = 'text-to-speech';
export const IMAGE_CREATOR_OPERATOR_ID = 'image-assistant';
export const TEXT_TO_VIDEO_OPERATOR_ID = 'text-to-video';
/** @deprecated Use TEXT_TO_VIDEO_OPERATOR_ID. */
export const VIDEO_CREATOR_OPERATOR_ID = TEXT_TO_VIDEO_OPERATOR_ID;
/** @deprecated Use TEXT_TO_VIDEO_MODELS. */
export const VIDEO_CREATOR_MODELS = TEXT_TO_VIDEO_MODELS;
export const MUSIC_CREATOR_OPERATOR_ID = 'music-creator';
export const DOCUMENT_READER_OCR_OPERATOR_ID = 'document-reader';
export const DOCUMENT_READER_OCR_MODELS = [
	{ id: 'document-reader-provider-coming-soon', name: 'Not available yet' },
] satisfies readonly Model[];
export const CRON_TASK_SCHEDULER_OPERATOR_ID = 'cron-task-scheduler';
export const BACKGROUND_TASK_OPERATOR_ID = 'background-task';

export const OPERATOR_DEFINITIONS = {
	assistant: {
		id: ASSISTANT_OPERATOR_ID,
		name: 'Assistant',
		docsPath: 'models/large-language-model.md',
		status: 'implemented',
	},
	speechToText: {
		id: SPEECH_TO_TEXT_OPERATOR_ID,
		name: 'Speech to text',
		docsPath: 'models/speech-to-text.md',
		status: 'implemented',
	},
	textToSpeech: {
		id: TEXT_TO_SPEECH_OPERATOR_ID,
		name: 'Text to speech',
		docsPath: 'models/text-to-speech.md',
		status: 'pending-runtime',
	},
	imageCreator: {
		id: IMAGE_CREATOR_OPERATOR_ID,
		name: 'Text to image',
		docsPath: 'models/text-to-image.md',
		status: 'pending-runtime',
	},
	videoCreator: {
		id: TEXT_TO_VIDEO_OPERATOR_ID,
		name: 'Text to video',
		docsPath: 'models/text-to-video.md',
		status: 'pending-runtime',
	},
	musicCreator: {
		id: MUSIC_CREATOR_OPERATOR_ID,
		name: 'Text to audio',
		docsPath: 'models/music-creator.md',
		status: 'pending-runtime',
	},
	documentReaderOcr: {
		id: DOCUMENT_READER_OCR_OPERATOR_ID,
		name: 'Document reader OCR',
		docsPath: 'models/ocr.md',
		status: 'pending-runtime',
	},
	cronTaskScheduler: {
		id: CRON_TASK_SCHEDULER_OPERATOR_ID,
		name: 'Cron task scheduler',
		docsPath: 'tasks/scheduled.md',
		status: 'implemented',
	},
	backgroundTask: {
		id: BACKGROUND_TASK_OPERATOR_ID,
		name: 'Background task',
		docsPath: 'tasks/background.md',
		status: 'implemented',
		registeredTaskTypes: ['agent.run'],
	},
} as const satisfies {
	assistant: OperatorBase;
	speechToText: OperatorBase;
	textToSpeech: OperatorBase;
	imageCreator: OperatorBase;
	videoCreator: OperatorBase;
	musicCreator: OperatorBase;
	documentReaderOcr: OperatorBase;
	cronTaskScheduler: SchedulerOperator;
	backgroundTask: TaskOperator;
};

/** @deprecated Use SPEECH_TO_TEXT_OPERATOR_ID. */
export const SPEECH_TRANSCRIBER_AGENT_ID = SPEECH_TO_TEXT_OPERATOR_ID;
/** @deprecated Use SPEECH_TO_TEXT_MODELS. */
export const SPEECH_TRANSCRIBER_MODELS = SPEECH_TO_TEXT_MODELS;
/** @deprecated Use TEXT_TO_SPEECH_OPERATOR_ID. */
export const TEXT_TO_SPEECH_AGENT_ID = TEXT_TO_SPEECH_OPERATOR_ID;
/** @deprecated Use IMAGE_CREATOR_OPERATOR_ID. */
export const IMAGE_ASSISTANT_AGENT_ID = IMAGE_CREATOR_OPERATOR_ID;
/** @deprecated Use IMAGE_CREATOR_MODELS. */
export const IMAGE_ASSISTANT_MODELS = IMAGE_CREATOR_MODELS;
/** @deprecated Use TEXT_TO_VIDEO_OPERATOR_ID. */
export const VIDEO_CREATOR_AGENT_ID = TEXT_TO_VIDEO_OPERATOR_ID;
/** @deprecated Use MUSIC_CREATOR_OPERATOR_ID. */
export const MUSIC_CREATOR_AGENT_ID = MUSIC_CREATOR_OPERATOR_ID;
/** @deprecated Use DOCUMENT_READER_OCR_OPERATOR_ID. */
export const DOCUMENT_READER_AGENT_ID = DOCUMENT_READER_OCR_OPERATOR_ID;
/** @deprecated Use DOCUMENT_READER_OCR_MODELS. */
export const DOCUMENT_READER_MODELS = DOCUMENT_READER_OCR_MODELS;

export function isEndpointOperator(
	operator: ModelOperator | EndpointOperator | undefined
): operator is EndpointOperator {
	return Boolean(operator && 'endpoint' in operator);
}
