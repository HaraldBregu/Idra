import { model, type ModelCatalog } from './models';

export const THREE_D_MODELS_BY_PROVIDER = {
	luma: [model('genie', 'Genie'), model('interactive-scenes', 'Interactive Scenes')],
} as const satisfies ModelCatalog;
