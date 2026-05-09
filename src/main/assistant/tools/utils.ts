import { CronAddTool, CronListTool, CronRemoveTool } from './cron';
import { ExecTool } from './exec';
import { GetProviderByIdTool, SetProviderApiKeyTool } from './providers';
import { ReadFileTool } from './read';
import {
	GetAssistantModelTool,
	GetAssistantServiceTool,
	SetAssistantServiceTool,
} from './services';
import { WriteFileTool } from './write';
import type { CronService } from '../../cron';
import type { StoreService } from '../../store';
import type { Tool } from './base';
export { expandUser } from './path-utils';

export function defaultTools(opts: { cron: CronService; store: StoreService }): Tool[] {
	return [
		new ReadFileTool(),
		new WriteFileTool(),
		new ExecTool(),
		new SetOpenAIKeyTool(opts.store),
		new SetAnthropicKeyTool(opts.store),
		new GetProviderByIdTool(opts.store),
		new SetProviderApiKeyTool(opts.store),
		new GetAssistantServiceTool(opts.store),
		new GetAssistantModelTool(opts.store),
		new SetAssistantServiceTool(opts.store),
		new CronAddTool(opts.cron),
		new CronListTool(opts.cron),
		new CronRemoveTool(opts.cron),
	];
}
