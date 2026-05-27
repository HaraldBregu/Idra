import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';

registerHooks({
	resolve(specifier, context, nextResolve) {
		if ((specifier.startsWith('./') || specifier.startsWith('../')) && !extname(specifier)) {
			try {
				return nextResolve(`${specifier}.ts`, context);
			} catch {
				return nextResolve(specifier, context);
			}
		}
		return nextResolve(specifier, context);
	},
	load(url, context, nextLoad) {
		if (!url.endsWith('.ts')) return nextLoad(url, context);
		const source = readFileSync(fileURLToPath(url), 'utf8');
		return {
			format: 'module',
			shortCircuit: true,
			source: stripTypeScriptTypes(source, { mode: 'transform' }),
		};
	},
});

await import('./example.ts');
