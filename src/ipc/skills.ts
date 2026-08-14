import type { EventBus } from '../event_bus';
import { SkillsChannels } from '../shared/ipc_channels_definitions';
import * as skills from '../agent/skills';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class SkillsIpc implements IpcModule {
	readonly name = 'skills';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(SkillsChannels.list, () => skills.list());
		registerQuery(SkillsChannels.load, (name: string) => skills.loadSkill(name));
		registerCommand(SkillsChannels.import, () => skills.importSkills());
		registerCommand(SkillsChannels.download, (name: string) => skills.downloadSkill(name));
		registerCommand(SkillsChannels.delete, (name: string) => skills.deleteSkill(name));
		registerCommand(SkillsChannels.openRoot, () => skills.openRoot());
		registerQuery(SkillsChannels.getRoot, () => skills.getRoot());
	}
}
