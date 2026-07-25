import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// ponytail: tsc keeps the app's extensionless relative imports; Node ESM and
// Node16/NodeNext type resolution reject those, so rewrite them after emit.
const pending = ['dist'];
const emitted = [];

while (pending.length > 0) {
	const dir = pending.pop();
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) pending.push(path);
		else if (path.endsWith('.d.ts') || path.endsWith('.js')) emitted.push(path);
	}
}

for (const file of emitted) {
	const source = readFileSync(file, 'utf8');
	const fixed = source.replace(/((?:from |import\()')(\.[^']*)(')/g, (_match, head, spec, tail) => {
		const target = resolve(dirname(file), spec);
		return `${head}${existsSync(`${target}.d.ts`) ? `${spec}.js` : `${spec}/index.js`}${tail}`;
	});
	if (fixed !== source) writeFileSync(file, fixed);
}
