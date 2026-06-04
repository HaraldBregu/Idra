import type { McpConnectors } from './types';
import { RemoteMcpConnectors } from './runtime';

export function mcpConnectors(ctx: { services: unknown }): McpConnectors | undefined {
	const services = ctx.services as { connectors?: ConstructorParameters<typeof RemoteMcpConnectors>[0] };
	return services.connectors ? new RemoteMcpConnectors(services.connectors) : undefined;
}
