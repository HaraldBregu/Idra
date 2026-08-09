import { app, isFriday, type ExtensionStoreValue } from '@friday/sdk';

import type { DiagramState } from './types';

export async function saveState(state: DiagramState): Promise<void> {
	if (isFriday()) {
		await app.setExtensionStoreValue('editor', state as unknown as ExtensionStoreValue);
		return;
	}
	localStorage.setItem('friday-diagrams-editor', JSON.stringify(state));
}
