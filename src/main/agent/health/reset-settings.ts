import { getHealthStore, setHealthStore } from './health-store';
import { DEFAULT_HEALTH_SETTINGS, type HealthSettings } from './types';

export function resetHealthSettings(): HealthSettings {
	setHealthStore(DEFAULT_HEALTH_SETTINGS);
	return getHealthStore();
}
