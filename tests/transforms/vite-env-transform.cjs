/**
 * Custom ts-jest transformer for source files under src/main/.
 *
 * Vite-specific syntax (`import.meta.env.*`, `import.meta.glob(...)`) is not
 * understood by ts-jest running in CJS mode. This transformer rewrites those
 * references before handing the source off to ts-jest so that tests never see
 * the raw Vite-only AST nodes.
 *
 *   import.meta.env.FOO   →  (globalThis.__VITE_ENV__ || {}).FOO
 *   import.meta.env       →  (globalThis.__VITE_ENV__ || {})
 *   import.meta.glob(…)   →  ({})   (returns empty record; tests mock modules instead)
 */
'use strict';

const path = require('path');
const { TsJestTransformer } = require('ts-jest');

const tsJest = new TsJestTransformer({
	tsconfig: path.resolve(__dirname, '../../tsconfig.node.json'),
	useESM: false,
});

/**
 * Rewrite Vite-specific import.meta.* syntax to expressions safe in Node/CJS.
 */
function rewriteViteSyntax(source) {
	return source
		// import.meta.glob(...) — replace entire call with an empty object literal.
		// Must come before the generic import.meta.env rule.
		.replace(/import\.meta\.glob\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g, '({})')
		// import.meta.env.PROPERTY → (globalThis.__VITE_ENV__ || {}).PROPERTY
		.replace(/import\.meta\.env\.(\w+)/g, '(globalThis.__VITE_ENV__ || {}).$1')
		// import.meta.env (bare) → (globalThis.__VITE_ENV__ || {})
		.replace(/import\.meta\.env/g, '(globalThis.__VITE_ENV__ || {})');
}

module.exports = {
	process(sourceText, sourcePath, options) {
		const rewritten = rewriteViteSyntax(sourceText);
		return tsJest.process(rewritten, sourcePath, options);
	},
	getCacheKey(sourceText, sourcePath, options) {
		const rewritten = rewriteViteSyntax(sourceText);
		return tsJest.getCacheKey(rewritten, sourcePath, options);
	},
};
