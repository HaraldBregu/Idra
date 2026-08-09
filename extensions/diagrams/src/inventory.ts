import mermaid from 'mermaid';

import { pluginsReady } from './plugins';

export async function getDiagramTypes(): Promise<string[]> {
	await pluginsReady;
	return mermaid
		.getRegisteredDiagramsMetadata()
		.map(({ id }) => id)
		.sort((left, right) => left.localeCompare(right));
}
