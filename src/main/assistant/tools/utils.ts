import { SetAnthropicKeyTool, SetAnthropicModelTool } from './anthropic';
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
import { CronAddTool, CronListTool, CronRemoveTool } from './cron';
import { ExecTool } from './exec';
import { SetOpenAIKeyTool, SetOpenAIModelTool } from './openai';
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
		new SetDiscordAllowFromTool(opts.store),
		new CronAddTool(opts.cron),
		new CronListTool(opts.cron),
		new CronRemoveTool(opts.cron),
	];
}
