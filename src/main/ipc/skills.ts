import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { SkillsChannels } from '../../shared/ipc/ipc-channels';
import { SkillsService } from '../skills';

export class SkillsIpc implements IpcModule {
	readonly name = 'skills';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const skills = container.get(SkillsService);

		registerQuery(SkillsChannels.list, () => skills.list());
		registerQuery(SkillsChannels.getRoot, () => skills.getRoot());
		registerCommand(SkillsChannels.import, () => skills.import());
		registerCommand(SkillsChannels.download, (id: string) => skills.download(id));
		registerCommand(SkillsChannels.delete, (id: string) => skills.delete(id));
		registerCommand(SkillsChannels.setEnabled, (id: string, enabled: boolean) =>
			skills.setEnabled(id, enabled),
		);
	}
}
