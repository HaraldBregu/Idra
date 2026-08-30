import type { Request } from 'express';
import type { User } from '@a2a-js/sdk/server';

export class RequestIdentity {
	private readonly clients = new WeakMap<Request, string>();

	set(request: Request, clientId: string): void {
		this.clients.set(request, clientId);
	}

	user = async (request: Request): Promise<User> => {
		const clientId = this.clients.get(request);
		if (!clientId) throw new Error('Authenticated client identity is missing.');
		return { isAuthenticated: true, userName: clientId };
	};
}
