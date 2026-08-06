import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { assertWikiSourceSafe } from '../wiki/wiki_source_safety';

const BINARY_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

export interface RagSource {
	readonly source: string;
	readonly sourceIndex: number;
	readonly file: string;
	readonly content: string;
}

export async function* collectRagSources(sources: readonly string[]): AsyncGenerator<RagSource> {
	for (const [sourceIndex, source] of sources.entries()) {
		if (!(await stat(source)).isDirectory()) {
			throw new Error(`The selected source is not a folder: ${source}`);
		}

		for (const file of (await readdir(source, { recursive: true })).sort()) {
			const absolutePath = path.join(source, file);
			if (!(await lstat(absolutePath)).isFile()) continue;

			let content: string;
			try {
				content = UTF8_DECODER.decode(await readFile(absolutePath));
			} catch {
				continue;
			}
			if (BINARY_CONTROL_CHARACTERS.test(content)) continue;

			assertWikiSourceSafe({ relativePath: file, content });
			yield { source, sourceIndex, file, content };
		}
	}
}
