import { DEFAULT_AGENT_ID } from '../constants';
import type { AgentStartupFileName } from '../agent/startup-files';
import type { AgentTool } from './types';
import { textResult } from './types';

type StartupFilesAction = 'list' | 'read' | 'write' | 'complete_bootstrap';

interface StartupFilesArgs {
	action: StartupFilesAction;
	name?: AgentStartupFileName;
	content?: string;
}

export const startupFilesTool: AgentTool<StartupFilesArgs> = {
	name: 'startup_files',
	description:
		'List, read, write, or complete bootstrap for allowlisted agent startup files under agent/workspaces/<agentId>.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['list', 'read', 'write', 'complete_bootstrap'],
				description: 'Operation to perform.',
			},
			name: {
				type: 'string',
				description: 'Allowlisted startup file name such as SOUL.md, USER.md, or IDENTITY.md.',
			},
			content: {
				type: 'string',
				description: 'UTF-8 file content for write.',
			},
		},
		required: ['action'],
		additionalProperties: false,
	},
	needsApproval: (args) => args.action === 'write' || args.action === 'complete_bootstrap',
	async execute(args, ctx) {
		const agentId = ctx.agentId ?? DEFAULT_AGENT_ID;
		try {
			if (args.action === 'list') {
				const files = await ctx.services.startupFiles.listFiles(agentId);
				return textResult(JSON.stringify({
					rootPath: ctx.services.startupFiles.getRootPath(agentId),
					files,
				}, null, 2));
			}

			if (args.action === 'read') {
				if (!args.name) return textResult('startup_files: name is required for read.', true);
				const file = await ctx.services.startupFiles.readFile(agentId, args.name);
				if (file.missing) {
					return textResult(`startup_files: ${args.name} is missing at ${file.path}`, true);
				}
				return textResult(`# ${file.path}\n${file.content ?? ''}`);
			}

			if (args.action === 'write') {
				if (!args.name) return textResult('startup_files: name is required for write.', true);
				if (typeof args.content !== 'string') {
					return textResult('startup_files: content is required for write.', true);
				}
				const file = await ctx.services.startupFiles.writeFile(agentId, args.name, args.content);
				return textResult(`wrote ${file.path} (${Buffer.byteLength(file.content ?? '', 'utf8')} bytes)`);
			}

			if (args.action === 'complete_bootstrap') {
				await ctx.services.startupFiles.completeBootstrap(agentId);
				return textResult('completed startup bootstrap');
			}

			return textResult(`startup_files: unsupported action ${String(args.action)}`, true);
		} catch (error) {
			return textResult(`startup_files: ${(error as Error).message}`, true);
		}
	},
};
