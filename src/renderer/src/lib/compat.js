import { CHAT_MODELS_BY_PROVIDER } from '../../../shared/providers/models/llm';
import { cloneModels } from '../../../shared/providers/models/types';
import { isRealtimeSpeechToTextModel as isRealtimeSpeechToTextModelFromCatalog } from '../../../shared/providers/models/stt';
export const AGENTS = {
    assistant: 'assistant',
    speechToText: 'speech-to-text',
    textToSpeech: 'text-to-speech',
    textToImage: 'text-to-image',
    textToVideo: 'text-to-video',
    textToAudio: 'text-to-audio',
    documentReader: 'document-reader',
    embedding: 'embedding',
};
export const appApi = window.app;
export function getLlmModels(providerId) {
    return cloneModels(CHAT_MODELS_BY_PROVIDER[providerId.trim().toLowerCase()]);
}
export function isRealtimeSpeechToTextModel(providerId, modelId) {
    return isRealtimeSpeechToTextModelFromCatalog(providerId, modelId);
}
