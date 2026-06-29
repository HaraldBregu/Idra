import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { SkillsChannels } from '../../shared/ipc/ipc-channels';
import type { SkillInfo } from '../../shared/skills/types';

export interface SkillsIpcDeps {}

export class SkillsIpc implements IpcModule<SkillsIpcDeps> {
	readonly name = 'skills';

	register(_deps: SkillsIpcDeps, _eventBus: EventBus): void {
		registerQuery(SkillsChannels.list, (): SkillInfo[] => []);
		registerQuery(SkillsChannels.getRoot, (): string => '');
		registerCommand(SkillsChannels.import, () => undefined);
		registerCommand(SkillsChannels.download, () => undefined);
		registerCommand(SkillsChannels.delete, (id: string) => ({ id, name: id, deleted: false }));
		registerCommand(SkillsChannels.setEnabled, (id: string, enabled: boolean) => ({
			id,
			name: id,
			description: '',
			location: '',
			folderPath: '',
			manifest: { name: id, enabled },
		}));
		registerCommand(SkillsChannels.openRoot, () => undefined);
	}
}
