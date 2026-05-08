import { ExecTool } from './exec';
import { ReadFileTool, WriteFileTool } from './filesystem';
import { CronAddTool, CronListTool, CronRemoveTool } from './cron';
import { SetAnthropicKeyTool, SetAnthropicModelTool } from './anthropic';
import { SetOpenAIKeyTool, SetOpenAIModelTool } from './openai';
import type { Tool } from './base';
import type { CronService } from '../../cron';
import type { StoreService } from '../../store';

export { Tool, type ToolSchema } from './base';
export { ExecTool } from './exec';
export { ReadFileTool, WriteFileTool } from './filesystem';
export { CronAddTool, CronListTool, CronRemoveTool } from './cron';
export { SetAnthropicKeyTool, SetAnthropicModelTool } from './anthropic';
export { SetOpenAIKeyTool, SetOpenAIModelTool } from './openai';

/**
 * Built-in tools enabled by default for a new Assistant.
 * Pass a `CronService` to include cron scheduling tools.
 * Pass a `StoreService` to include provider settings tools.
 */
export function defaultTools(opts: { cron?: CronService; store?: StoreService } = {}): Tool[] {
	const tools: Tool[] = [new ReadFileTool(), new WriteFileTool(), new ExecTool()];
	if (opts.store) {
		tools.push(
			new SetOpenAIKeyTool(opts.store),
			new SetOpenAIModelTool(opts.store),
			new SetAnthropicKeyTool(opts.store),
			new SetAnthropicModelTool(opts.store)
		);
	}
	if (opts.cron) {
		tools.push(new CronAddTool(opts.cron), new CronListTool(opts.cron), new CronRemoveTool(opts.cron));
	}
	return tools;
}
