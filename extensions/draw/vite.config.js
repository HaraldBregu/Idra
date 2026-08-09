import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	base: './',
	plugins: [react()],
	publicDir: path.resolve(
		import.meta.dirname,
		'./node_modules/@excalidraw/excalidraw/dist/prod/fonts'
	),
	resolve: {
		alias: {
			'@friday/sdk': path.resolve(import.meta.dirname, '../../packages/sdk/index.ts'),
		},
	},
});
