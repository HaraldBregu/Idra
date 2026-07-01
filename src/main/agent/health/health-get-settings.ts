import { getHealthStore } from './health-store';
import type { HealthSettings } from './health-types';

export function getHealthSettings(): HealthSettings {
	return getHealthStore();
}
