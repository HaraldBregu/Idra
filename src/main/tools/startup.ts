import {
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_MEMORY_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_USER_FILENAME,
	type AgentStartupFile,
	type AgentStartupFileSummary,
} from '../agent/startup-files';
import { DEFAULT_AGENT_ID } from '../constants';
import type { AgentTool, AgentToolResult, ToolContext } from './core/types';

type StartupFilesAction = 'list' | 'read' | 'write' | 'complete_bootstrap';

interface StartupFilesArgs {
	action: StartupFilesAction;
	name?: string;
	content?: string;
}

interface BootstrapArgs {
	identity: string;
	user: string;
	soul: string;
	heartbeat?: string;
	memory?: string;
	complete?: boolean;
}

interface StartupFilesResult {
	action: StartupFilesAction;
	agentId: string;
	rootPath: string;
	files?: AgentStartupFileSummary[];
	file?: AgentStartupFile;
}

interface BootstrapResult {
	agentId: string;
	rootPath: string;
	files: AgentStartupFile[];
	bootstrapCompleted: boolean;
	bootstrapFile?: AgentStartupFile;
}

function agentIdFor(ctx: ToolContext): string {
	return ctx.agentId ?? DEFAULT_AGENT_ID;
}

function jsonResult<T>(payload: T): AgentToolResult<T> {
	return {
		status: 'ok',
		content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
		details: payload,
	};
}

function errorResult<T = never>(message: string): AgentToolResult<T> {
	return { status: 'error', content: [{ type: 'text', text: message }] };
}

export const startupFilesTool: AgentTool<StartupFilesArgs, StartupFilesResult> = {
	name: 'startup_files',
	description:
		'Manage allowlisted agent startup files under the current agent startup workspace. Use list/read/write for individual startup files and complete_bootstrap when BOOTSTRAP.md is done.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['list', 'read', 'write', 'complete_bootstrap'],
			},
			name: {
				type: 'string',
				enum: [
					'AGENTS.md',
					'SOUL.md',
					'IDENTITY.md',
					'USER.md',
					'HEARTBEAT.md',
					'BOOTSTRAP.md',
					'MEMORY.md',
				],
			},
			content: { type: 'string' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const agentId = agentIdFor(ctx);
		const rootPath = ctx.services.startupFiles.getRootPath(agentId);
		try {
			switch (args.action) {
				case 'list':
					return jsonResult({
						action: args.action,
						agentId,
						rootPath,
						files: await ctx.services.startupFiles.listFiles(agentId),
					});
				case 'read':
					if (!args.name) return errorResult('startup_files: name is required for read.');
					return jsonResult({
						action: args.action,
						agentId,
						rootPath,
						file: await ctx.services.startupFiles.readFile(agentId, args.name),
					});
				case 'write':
					if (!args.name) return errorResult('startup_files: name is required for write.');
					if (args.content === undefined) {
						return errorResult('startup_files: content is required for write.');
					}
					return jsonResult({
						action: args.action,
						agentId,
						rootPath,
						file: await ctx.services.startupFiles.writeFile(agentId, args.name, args.content),
					});
				case 'complete_bootstrap':
					return jsonResult({
						action: args.action,
						agentId,
						rootPath,
						file: await ctx.services.startupFiles.completeBootstrap(agentId),
					});
				default:
					return errorResult('startup_files: unsupported action.');
			}
		} catch (error) {
			return errorResult(`startup_files: ${(error as Error).message}`);
		}
	},
};

export const bootstrapTool: AgentTool<BootstrapArgs, BootstrapResult> = {
	name: 'bootstrap',
	description:
		'Create or update the required bootstrap startup files for the current agent. Provide complete Markdown content for identity, user, and soul. The tool knows the file locations; do not pass paths. By default it completes bootstrap after writing.',
	schema: {
		type: 'object',
		properties: {
			identity: {
				type: 'string',
				description: 'Complete Markdown content for IDENTITY.md.',
			},
			user: {
				type: 'string',
				description: 'Complete Markdown content for USER.md.',
			},
			soul: {
				type: 'string',
				description: 'Complete Markdown content for SOUL.md.',
			},
			heartbeat: {
				type: 'string',
				description: 'Optional complete Markdown content for HEARTBEAT.md.',
			},
			memory: {
				type: 'string',
				description: 'Optional complete Markdown content for MEMORY.md.',
			},
			complete: {
				type: 'boolean',
				description: 'When true or omitted, remove BOOTSTRAP.md after writing the files.',
			},
		},
		required: ['identity', 'user', 'soul'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const agentId = agentIdFor(ctx);
		const rootPath = ctx.services.startupFiles.getRootPath(agentId);
		try {
			const writes: Array<[string, string]> = [
				[DEFAULT_IDENTITY_FILENAME, args.identity],
				[DEFAULT_USER_FILENAME, args.user],
				[DEFAULT_SOUL_FILENAME, args.soul],
			];
			if (args.heartbeat !== undefined) writes.push([DEFAULT_HEARTBEAT_FILENAME, args.heartbeat]);
			if (args.memory !== undefined) writes.push([DEFAULT_MEMORY_FILENAME, args.memory]);

			const files: AgentStartupFile[] = [];
			for (const [name, content] of writes) {
				files.push(await ctx.services.startupFiles.writeFile(agentId, name, content));
			}

			const shouldComplete = args.complete ?? true;
			const bootstrapFile = shouldComplete
				? await ctx.services.startupFiles.completeBootstrap(agentId)
				: undefined;

			return jsonResult({
				agentId,
				rootPath,
				files,
				bootstrapCompleted: shouldComplete,
				bootstrapFile,
			});
		} catch (error) {
			return errorResult(`bootstrap: ${(error as Error).message}`);
		}
	},
};
