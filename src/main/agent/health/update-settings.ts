import { getHealthStore, setHealthStore } from './health-store';
import type { HealthSettings } from './types';

export function updateHealthSettings(patch: Partial<HealthSettings>): HealthSettings {
	const next = { ...getHealthStore(), ...patch };
	setHealthStore(next);
	return next;
}
