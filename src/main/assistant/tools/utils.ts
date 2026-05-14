import os from 'node:os';
import path from 'node:path';
import {
	OpenAccessibilityTool,
	OpenAppDataFolderTool,
	OpenScreenRecordingTool,
	SetMenuBarTool,
	SetThemeModeTool,
} from './app';
import { AskHumanTool } from './ask-human';
import { CronAddTool, CronListTool, CronRemoveTool } from './cron';
import { ExecTool } from './exec';
import { FindTool } from './find';
import { GetProviderByIdTool, SetProviderApiKeyTool } from './providers';
import { ReadFileTool } from './read';
import {
	GetAssistantModelTool,
	GetAssistantServiceTool,
	SetAssistantServiceTool,
} from './services';
import { GetWorkspaceContentTool, GetWorkspacePathTool } from './workspace';
import { WriteFileTool } from './write';
import type { EventBus } from '../../core/event-bus';
import type { CronService } from '../../cron';
import type { LoggerService } from '../../logger';
import type { StoreService } from '../../store';
import type { WorkspaceService } from '../../workspace';
import type { Tool } from './base';

export function expandUser(p: string): string {
	if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
	return p;
}

export function defaultTools(opts: {
	cron: CronService;
	store: StoreService;
	eventBus: EventBus;
	logger: LoggerService;
	workspace: WorkspaceService;
}): Tool[] {
	return [
		new AskHumanTool(),
		new ReadFileTool(),
		new WriteFileTool(),
		new FindTool(),
		new ExecTool(),
		new GetWorkspaceContentTool(opts.workspace),
		new GetWorkspacePathTool(opts.workspace),
		new GetProviderByIdTool(opts.store),
		new SetProviderApiKeyTool(opts.store),
		new GetAssistantServiceTool(opts.store),
		new GetAssistantModelTool(opts.store),
		new SetAssistantServiceTool(opts.store),
		new CronAddTool(opts.cron),
		new CronListTool(opts.cron),
		new CronRemoveTool(opts.cron),
		new SetThemeModeTool(opts.eventBus),
		new OpenAppDataFolderTool(opts.logger),
		new OpenAccessibilityTool(),
		new OpenScreenRecordingTool(),
		new SetMenuBarTool(opts.eventBus),
	];
}
