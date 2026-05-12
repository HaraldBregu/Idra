import { Tool } from '../assistant/tools/base';
import type { ConnectorConfig, ConnectorTool } from '../../shared/connectors';
import type { McpRegistry } from './McpRegistry';

export class McpToolAdapter extends Tool {
	readonly name: string;
	readonly description: string;
	readonly parameters: Record<string, unknown>;

	constructor(
		private readonly connector: ConnectorConfig,
		private readonly tool: ConnectorTool,
		private readonly registry: McpRegistry
	) {
		super();
		this.name = `${connector.name}.${tool.name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
		this.description = tool.description ?? `Run ${tool.name} from ${connector.name}.`;
		this.parameters =
			tool.inputSchema && typeof tool.inputSchema === 'object'
				? tool.inputSchema
				: { type: 'object', properties: {} };
	}

	get id(): string {
		return `${this.connector.id}.${this.tool.name}`;
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const result = await this.registry.callTool(this.connector.id, this.tool.name, args);
		return typeof result === 'string' ? result : JSON.stringify(result);
	}
}
