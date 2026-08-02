export { generateMusic } from './tta_generate';
export { buildMusicAdapter } from './tta_factory';
export {
	MusicProviderAuthError,
	MusicProviderRequestError,
	MusicProviderUnsupportedError,
} from './tta_errors';
export type {
	MusicAdapter,
	MusicAdapterGenerationRequest,
	MusicGenerationResult,
	MusicProviderSpec,
} from './tta_types';
