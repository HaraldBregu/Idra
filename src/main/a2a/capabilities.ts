import type { RequestHandler } from 'express';

export function rejectUnsupportedCapabilities(): RequestHandler {
	return (request, response, next): void => {
		const extendedCard = request.method === 'GET' && request.path === '/extendedAgentCard';
		const pushNotifications = /^\/tasks\/[^/]+\/pushNotificationConfigs(?:\/[^/]+)?$/.test(
			request.path
		);
		if (!extendedCard && !pushNotifications) {
			next();
			return;
		}
		const reason = extendedCard ? 'UNSUPPORTED_OPERATION' : 'PUSH_NOTIFICATION_NOT_SUPPORTED';
		const message = extendedCard
			? 'Agent does not support authenticated extended cards.'
			: 'Agent does not support push notifications.';
		response
			.status(400)
			.type('application/a2a+json')
			.json({
				error: {
					code: 400,
					status: 'FAILED_PRECONDITION',
					message,
					details: [
						{
							'@type': 'type.googleapis.com/google.rpc.ErrorInfo',
							reason,
							domain: 'a2a-protocol.org',
						},
					],
				},
			});
	};
}
