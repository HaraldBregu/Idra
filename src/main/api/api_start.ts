import { createServer } from 'node:http';
import type { LoggerService } from '../shared';
import { request } from './api_request';
import { token } from './api_token';

const DEFAULT_PORT = 8765;

/**
 * Serve the IPC API on loopback so other apps can drive Friday through @friday/sdk.
 * Set FRIDAY_API_PORT=0 to keep the port closed.
 */
export function startApiServer(logger: LoggerService): void {
	const port = Number(process.env.FRIDAY_API_PORT ?? DEFAULT_PORT);
	if (!port) {
		logger.info('Api', 'API server disabled (FRIDAY_API_PORT=0)');
		return;
	}

	const server = createServer((req, res) => {
		void request(req, res).catch((error) => {
			logger.error('Api', 'Request failed', error);
			res.destroy();
		});
	});

	server.on('error', (error) => logger.error('Api', `Failed to listen on ${port}`, error));
	server.listen(port, '127.0.0.1', () => {
		logger.info('Api', `Listening on http://127.0.0.1:${port} (token in userData/sdk-token)`);
		token();
	});
}
