import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// ponytail: tsc keeps the app's extensionless relative imports; Node16/NodeNext
// consumers reject those, so rewrite them in the emitted declarations.
const pending = ['dist'];
const declarations = [];

while (pending.length > 0) {
	const dir = pending.pop();
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) pending.push(path);
		else if (path.endsWith('.d.ts') || path.endsWith('.js')) declarations.push(path);
	}
}

for (const file of declarations) {
	const source = readFileSync(file, 'utf8');
	const fixed = source.replace(/((?:from |import\()')(\.[^']*)(')/g, (_match, head, spec, tail) => {
		const target = resolve(dirname(file), spec);
		return `${head}${existsSync(`${target}.d.ts`) ? `${spec}.js` : `${spec}/index.js`}${tail}`;
	});
	if (fixed !== source) writeFileSync(file, fixed);
}
