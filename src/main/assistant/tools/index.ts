import { ExecTool } from './exec';
import { ReadFileTool } from './read';
import { WriteFileTool } from './write';
import { CronAddTool, CronListTool, CronRemoveTool } from './cron';
import { SetAnthropicKeyTool, SetAnthropicModelTool } from './anthropic';
import { SetOpenAIKeyTool, SetOpenAIModelTool } from './openai';
import {
	GetChannelsTool,
	GetDiscordChannelTool,
	GetTelegramChannelTool,
	GetWhatsappChannelTool,
	SetDiscordAllowFromTool,
	SetDiscordTokenTool,
	SetTelegramAllowFromTool,
	SetTelegramTokenTool,
	SetWhatsappPhoneTool,
	SetWhatsappTokenTool,
} from './channels';
import type { Tool } from './base';
import type { CronService } from '../../cron';
import type { StoreService } from '../../store';

export { Tool, type ToolSchema } from './base';
export { ExecTool } from './exec';
export { ReadFileTool } from './read';
export { WriteFileTool } from './write';
export { CronAddTool, CronListTool, CronRemoveTool } from './cron';
export { SetAnthropicKeyTool, SetAnthropicModelTool } from './anthropic';
export { SetOpenAIKeyTool, SetOpenAIModelTool } from './openai';
export {
	GetChannelsTool,
	GetDiscordChannelTool,
	GetTelegramChannelTool,
	GetWhatsappChannelTool,
	SetDiscordAllowFromTool,
	SetDiscordTokenTool,
	SetTelegramAllowFromTool,
	SetTelegramTokenTool,
	SetWhatsappPhoneTool,
	SetWhatsappTokenTool,
} from './channels';

/**
 * Built-in tools enabled by default for a new Assistant.
 * Pass a `CronService` to include cron scheduling tools.
 * Pass a `StoreService` to include provider and channel settings tools.
 */
export function defaultTools(opts: { cron?: CronService; store?: StoreService } = {}): Tool[] {
	const tools: Tool[] = [new ReadFileTool(), new WriteFileTool(), new ExecTool()];
	if (opts.store) {
		tools.push(
			new SetOpenAIKeyTool(opts.store),
			new SetOpenAIModelTool(opts.store),
			new SetAnthropicKeyTool(opts.store),
			new SetAnthropicModelTool(opts.store),
			new GetChannelsTool(opts.store),
			new GetTelegramChannelTool(opts.store),
			new SetTelegramTokenTool(opts.store),
			new SetTelegramAllowFromTool(opts.store),
			new GetWhatsappChannelTool(opts.store),
			new SetWhatsappPhoneTool(opts.store),
			new SetWhatsappTokenTool(opts.store),
			new GetDiscordChannelTool(opts.store),
			new SetDiscordTokenTool(opts.store),
			new SetDiscordAllowFromTool(opts.store)
		);
	}
	if (opts.cron) {
		tools.push(new CronAddTool(opts.cron), new CronListTool(opts.cron), new CronRemoveTool(opts.cron));
	}
	return tools;
}
