import type { PublicProvider } from '@shared';

let catalog: readonly PublicProvider[] = [];

export async function loadProviders(): Promise<void> {
	catalog = await window.app.providers();
}

export function providers(): readonly PublicProvider[] {
	return catalog;
}
