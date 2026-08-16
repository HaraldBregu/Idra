import type { RequestHandler } from 'express';

export function allowA2aOperations(): RequestHandler {
	return (request, response, next): void => {
		const allowed =
			(request.method === 'POST' &&
				(request.path === '/message:send' || request.path === '/message:stream')) ||
			(request.method === 'GET' &&
				(request.path === '/tasks' || /^\/tasks\/[^/:]+$/.test(request.path))) ||
			(request.method === 'POST' && /^\/tasks\/[^/:]+:(cancel|subscribe)$/.test(request.path));
		if (allowed) {
			next();
			return;
		}
		response.status(404).json({ error: 'Not Found' });
	};
}
