import {
	assertUniqueToolNames,
	isAgentTool,
	markPluginTool,
	normalizeToolName,
	ToolAuthorizationError,
	type AgentTool,
	type ToolDiagnostics,
} from '../tools/common';
import type { PluginToolContext, PluginToolFactory, PluginToolManifest } from './tool-types';

export type RegisteredPluginTools = {
	manifest: PluginToolManifest;
	factory: PluginToolFactory;
};

export type ResolvePluginToolsOptions = {
	context: PluginToolContext;
	toolsAllow?: string[];
	toolsDeny?: string[];
	existingToolNames?: Set<string>;
	diagnostics?: ToolDiagnostics;
};

export class PluginToolRegistry {
	private readonly plugins = new Map<string, RegisteredPluginTools>();

	register(plugin: RegisteredPluginTools): void {
		const id = normalizeToolName(plugin.manifest.id);
		if (!id) throw new ToolAuthorizationError('Plugin id is required.', 'invalid_plugin');
		if (this.plugins.has(id)) throw new ToolAuthorizationError(`Plugin already registered: ${id}`, 'plugin_conflict');
		this.plugins.set(id, plugin);
	}

	listDescriptors(): PluginToolManifest[] {
		return [...this.plugins.values()].map((entry) => ({
			...entry.manifest,
			tools: entry.manifest.tools.map((tool) => ({ ...tool })),
		}));
	}

	async resolveTools(options: ResolvePluginToolsOptions): Promise<AgentTool[]> {
		const allow = options.toolsAllow?.map(normalizeToolName);
		const deny = new Set((options.toolsDeny ?? []).map(normalizeToolName));
		const existing = new Set([...(options.existingToolNames ?? [])].map(normalizeToolName));
		const resolved: AgentTool[] = [];

		for (const plugin of this.plugins.values()) {
			const pluginId = normalizeToolName(plugin.manifest.id);
			if (plugin.manifest.enabled === false) continue;
			const declared = new Map(plugin.manifest.tools.map((tool) => [normalizeToolName(tool.name), tool]));
			const pluginExplicitlyAllowed =
				allow === undefined ||
				allow.includes('*') ||
				allow.includes(pluginId) ||
				allow.includes(`plugin:${pluginId}`) ||
				allow.includes('group:plugins') ||
				plugin.manifest.tools.some((tool) => allow.includes(normalizeToolName(tool.name)));
			if (!pluginExplicitlyAllowed) continue;

			const produced = await plugin.factory(options.context);
			const tools = produced === undefined || produced === null ? [] : Array.isArray(produced) ? produced : [produced];
			for (const tool of tools) {
				if (!isAgentTool(tool)) {
					throw new ToolAuthorizationError(`Plugin ${pluginId} returned an invalid tool.`, 'invalid_plugin_tool');
				}
				const normalized = normalizeToolName(tool.name);
				const descriptor = declared.get(normalized);
				if (!descriptor) {
					throw new ToolAuthorizationError(
						`Plugin ${pluginId} returned undeclared tool ${tool.name}.`,
						'undeclared_plugin_tool'
					);
				}
				if (deny.has(normalized) || deny.has(pluginId) || deny.has(`plugin:${pluginId}`)) {
					options.diagnostics?.filteredTools.push({
						toolName: tool.name,
						stage: 'plugin',
						reason: 'denied by plugin policy',
					});
					continue;
				}
				if (descriptor.optional && !isExplicitlyAllowed(normalized, pluginId, allow)) {
					options.diagnostics?.filteredTools.push({
						toolName: tool.name,
						stage: 'plugin',
						reason: 'optional plugin tool requires explicit allowlisting',
					});
					continue;
				}
				if (existing.has(normalized) || resolved.some((candidate) => normalizeToolName(candidate.name) === normalized)) {
					throw new ToolAuthorizationError(
						`Plugin tool name conflict: ${tool.name}.`,
						'plugin_tool_conflict'
					);
				}
				existing.add(normalized);
				resolved.push(markPluginTool(tool, pluginId, descriptor.optional === true));
			}
		}

		assertUniqueToolNames(resolved);
		return resolved;
	}
}

function isExplicitlyAllowed(toolName: string, pluginId: string, allow: string[] | undefined): boolean {
	if (!allow) return false;
	return allow.includes('*') || allow.includes(toolName) || allow.includes(pluginId) || allow.includes(`plugin:${pluginId}`);
}

