import { SetAnthropicKeyTool } from './anthropic';
import { CronAddTool, CronListTool, CronRemoveTool } from './cron';
import { ExecTool } from './exec';
import { SetOpenAIKeyTool } from './openai';
import { ReadFileTool } from './read';
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
		new CronAddTool(opts.cron),
		new CronListTool(opts.cron),
		new CronRemoveTool(opts.cron),
	];
}
