const tsJest = require('ts-jest');

const createTransformer = tsJest.createTransformer ?? tsJest.default?.createTransformer;
const transformer = createTransformer({
	tsconfig: 'tsconfig.node.json',
	useESM: false,
});

module.exports = {
	process(sourceText, sourcePath, jestConfig, transformOptions) {
		return transformer.process(
			sourceText
				.replace(/import\.meta\.env/g, 'globalThis.__VITE_ENV__')
				.replace(/import\.meta\.glob/g, 'globalThis.__VITE_GLOB__'),
			sourcePath,
			jestConfig,
			transformOptions
		);
	},
};
