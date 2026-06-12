const tsJest = require('ts-jest').default;

const mainTransformer = tsJest.createTransformer({
	tsconfig: 'tsconfig.node.json',
	useESM: false,
});

const rendererTransformer = tsJest.createTransformer({
	tsconfig: 'tsconfig.web.json',
	useESM: false,
});

function rewriteViteEnv(sourceText) {
	return sourceText.replace(/\bimport\.meta\.env\b/g, 'globalThis.__VITE_ENV__');
}

module.exports = {
	process(sourceText, sourcePath, jestConfig, transformOptions) {
		const transformer = sourcePath.includes('/src/renderer/')
			? rendererTransformer
			: mainTransformer;
		return transformer.process(
			rewriteViteEnv(sourceText),
			sourcePath,
			jestConfig,
			transformOptions
		);
	},
};
