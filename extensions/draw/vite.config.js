import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const fontsSource = path.resolve(
	import.meta.dirname,
	'./node_modules/@excalidraw/excalidraw/dist/prod/fonts'
);

function excalidrawFonts() {
	return {
		name: 'excalidraw-fonts',
		closeBundle() {
			cpSync(fontsSource, path.resolve(import.meta.dirname, './dist/fonts'), {
				recursive: true,
			});
		},
		configureServer(server) {
			server.middlewares.use('/fonts', (request, response, next) => {
				const requestPath = decodeURIComponent(request.url ?? '/');
				const fontPath = path.resolve(fontsSource, `.${requestPath}`);
				if (
					!fontPath.startsWith(`${fontsSource}${path.sep}`) ||
					!existsSync(fontPath) ||
					!statSync(fontPath).isFile()
				) {
					next();
					return;
				}
				response.setHeader('Content-Type', 'font/woff2');
				createReadStream(fontPath).pipe(response);
			});
		},
	};
}

export default defineConfig({
	base: './',
	plugins: [react(), excalidrawFonts()],
	publicDir: false,
	resolve: {
		alias: {
			'@friday/sdk': path.resolve(import.meta.dirname, '../../packages/sdk/index.ts'),
		},
	},
});
