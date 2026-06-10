import type { ModelEvent, ModelRequest, ModelResponse } from '../types';

export abstract class ModelModule {
	abstract generate(request: ModelRequest): Promise<ModelResponse>;
	abstract stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}
