import type { AgentStartupFilesServicePort } from '../shared/startup-types';
import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { assertWorkspaceFileName, type WorkspaceFileName } from '../../agent/workspace/files';

type StartupFilesAction = 'list' | 'read' | 'write' | 'complete_bootstrap';

interface StartupFilesArgs {
	action?: StartupFilesAction;
	operation?: StartupFilesAction;
	name?: WorkspaceFileName;
	content?: string;
	files?: Record<string, string>;
}

function actionFromArgs(args: StartupFilesArgs): StartupFilesAction | '' {
	return args.action ?? args.operation ?? '';
}

function requireStartupFileName(value: unknown): WorkspaceFileName {
	if (typeof value !== 'string') throw new Error('name is required.');
	assertWorkspaceFileName(value);
	return value;
}

function startupFileWrites(args: StartupFilesArgs): Array<[WorkspaceFileName, string]> {
	if (args.files && typeof args.files === 'object' && !Array.isArray(args.files)) {
		return Object.entries(args.files).map(([name, content]) => {
			assertWorkspaceFileName(name);
			if (typeof content !== 'string') throw new Error(`${name} content must be a string.`);
			return [name, content];
		});
	}
	const name = requireStartupFileName(args.name);
	if (typeof args.content !== 'string') throw new Error('content is required.');
	return [[name, args.content]];
}

export function createStartupFilesTool(
	agentId: string,
	startupFiles: AgentStartupFilesServicePort
): AgentTool<StartupFilesArgs> {
	return {
		name: 'startup_files',
		description:
			'List, read, write, or complete bootstrap for allowlisted Friday startup files.',
		schema: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['list', 'read', 'write', 'complete_bootstrap'],
					description: 'Operation to perform.',
				},
				operation: {
					type: 'string',
					enum: ['list', 'read', 'write', 'complete_bootstrap'],
					description: 'Compatibility alias for action.',
				},
				name: {
					type: 'string',
					description: 'Allowlisted startup file name such as SOUL.md, USER.md, or IDENTITY.md.',
				},
				content: {
					type: 'string',
					description: 'UTF-8 file content for write.',
				},
				files: {
					type: 'object',
					additionalProperties: { type: 'string' },
					description: 'Batch file writes keyed by allowlisted startup file name.',
				},
			},
			additionalProperties: false,
		},
		async execute(args) {
			try {
				const action = actionFromArgs(args);
				if (action === 'list') {
					const files = await startupFiles.listFiles(agentId);
					return textResult(
						JSON.stringify(
							{
								rootPath: startupFiles.getRootPath(agentId),
								files,
							},
							null,
							2
						)
					);
				}

				if (action === 'read') {
					const name = requireStartupFileName(args.name);
					const file = await startupFiles.readFile(agentId, name);
					if (file.missing) {
						return textResult(`startup_files: ${name} is missing at ${file.path}`, true);
					}
					return textResult(`# ${file.path}\n${file.content ?? ''}`);
				}

				if (action === 'write') {
					const written: WorkspaceFileName[] = [];
					for (const [name, content] of startupFileWrites(args)) {
						await startupFiles.writeFile(agentId, name, content);
						written.push(name);
					}
					return textResult(`updated ${written.join(', ')}`);
				}

				if (action === 'complete_bootstrap') {
					await startupFiles.completeBootstrap(agentId);
					return textResult('bootstrap completed');
				}

				return textResult('startup_files: unsupported action', true);
			} catch (error) {
				return textResult(`startup_files: ${(error as Error).message}`, true);
			}
		},
	};
}
