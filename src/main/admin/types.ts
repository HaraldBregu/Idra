import type { FastifyReply, FastifyRequest } from 'fastify';

export type AdminAuthentication = (
	request: FastifyRequest,
	reply: FastifyReply
) => Promise<unknown>;
