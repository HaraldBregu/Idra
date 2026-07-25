import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// ponytail: tsc keeps the app's extensionless relative imports; Node16/NodeNext
// consumers reject those, so rewrite them in the emitted declarations.
function declarations(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return declarations(path);
		return path.endsWith('.d.ts') ? [path] : [];
	});
}

for (const file of declarations('dist')) {
	const source = readFileSync(file, 'utf8');
	const fixed = source.replace(/((?:from |import\()')(\.[^']*)(')/g, (_match, head, spec, tail) => {
		const target = resolve(dirname(file), spec);
		return `${head}${existsSync(`${target}.d.ts`) ? `${spec}.js` : `${spec}/index.js`}${tail}`;
	});
	if (fixed !== source) writeFileSync(file, fixed);
}
