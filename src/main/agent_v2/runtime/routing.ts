import type { RuntimeInput } from './types';

export function routeModel(input: RuntimeInput): string {
	if (input.model) return input.model;
	const route = input.modelRoutes?.find((candidate) => candidate.task === input.task);
	return route?.model ?? 'default';
}
