import type { RequestHandler } from 'express';

export function includeListResponseFields(): RequestHandler {
	return (request, response, next): void => {
		if (request.method !== 'GET' || request.path !== '/tasks') {
			next();
			return;
		}
		const send = response.json.bind(response);
		response.json = ((body: unknown) => {
			if (
				response.statusCode >= 200 &&
				response.statusCode < 300 &&
				typeof body === 'object' &&
				body !== null &&
				!Array.isArray(body)
			) {
				return send({ tasks: [], nextPageToken: '', pageSize: 0, totalSize: 0, ...body });
			}
			return send(body);
		}) as typeof response.json;
		next();
	};
}
