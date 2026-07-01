import { getHealthStore } from './store';
import type { HealthSettings } from './types';

export function getHealthSettings(): HealthSettings {
	return getHealthStore();
}
