import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import pkg from './package.json';

export default defineConfig({
	main: {
		envPrefix: ['MAIN_VITE_', 'VITE_'],
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				input: {
					index: resolve(__dirname, 'src/main/index.ts'),
				},
				output: {
					entryFileNames: '[name].js',
				},
			},
		},
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
		build: {
			target: 'node22',
			rollupOptions: {
				output: {
					format: 'cjs',
					entryFileNames: '[name].js',
				},
			},
		},
	},
	renderer: {
		publicDir: resolve(__dirname, './src/renderer/public'),
		resolve: {
			alias: {
				'@': resolve(__dirname, './src/renderer/src'),
				'@utils': resolve(__dirname, './src/renderer/src/utils'),
				'@pages': resolve(__dirname, './src/renderer/src/pages'),
				'@store': resolve(__dirname, './src/renderer/src/store'),
				'@components': resolve(__dirname, './src/renderer/src/components'),
				'@icons': resolve(__dirname, './src/renderer/src/components/icons'),
				'@shared': resolve(__dirname, './src/shared'),
				'@resources': resolve(__dirname, 'resources'),
			},
		},
		define: {
			__APP_NAME__: JSON.stringify(pkg.productName),
			__APP_DESCRIPTION__: JSON.stringify(pkg.description),
			__APP_VERSION__: JSON.stringify(pkg.version),
			__APP_AUTHOR__: JSON.stringify(pkg.author),
			__APP_HOMEPAGE__: JSON.stringify(pkg.homepage),
			__APP_LICENSE__: JSON.stringify(pkg.license),
		},
		plugins: [
			react(),
			tsconfigPaths({ ignoreConfigErrors: true }),
		],
		build: {
			rollupOptions: {
				input: {
					index: resolve(__dirname, 'src/renderer/index.html'),
					tray: resolve(__dirname, 'src/renderer/tray.html'),
				},
			},
		},
	},
});
