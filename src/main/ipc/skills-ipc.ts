import { dialog, ipcMain } from 'electron';

import type { EventBus } from '../core/event-bus';
import type { IpcModule } from './ipc-module';
import type { MainServiceContainer } from '../service-registry';
import { SkillsChannels } from '../../shared/ipc-channels';
import { wrapSimpleHandler } from './ipc-error-handler';

export class SkillsIpc implements IpcModule {
	readonly name = 'skills';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const skills = container.get('skills');

		ipcMain.handle(
			SkillsChannels.list,
			wrapSimpleHandler(() => skills.list(), SkillsChannels.list)
		);

		ipcMain.handle(
			SkillsChannels.load,
			wrapSimpleHandler((name: string) => skills.load(name), SkillsChannels.load)
		);

		ipcMain.handle(
			SkillsChannels.import,
			wrapSimpleHandler(async () => {
				const result = await dialog.showOpenDialog({
					properties: ['openDirectory'],
					title: 'Import skill',
				});
				const sourcePath = result.filePaths[0];
				if (result.canceled || !sourcePath) return undefined;
				return skills.importSkill(sourcePath);
			}, SkillsChannels.import)
		);

		ipcMain.handle(
			SkillsChannels.download,
			wrapSimpleHandler(async (name: string) => {
				const result = await dialog.showOpenDialog({
					properties: ['openDirectory', 'createDirectory'],
					title: 'Download skill',
				});
				const destinationPath = result.filePaths[0];
				if (result.canceled || !destinationPath) return undefined;
				return skills.downloadSkill(name, destinationPath);
			}, SkillsChannels.download)
		);

		ipcMain.handle(
			SkillsChannels.delete,
			wrapSimpleHandler((name: string) => skills.deleteSkill(name), SkillsChannels.delete)
		);

		ipcMain.handle(
			SkillsChannels.getRoot,
			wrapSimpleHandler(() => skills.getRootPath(), SkillsChannels.getRoot)
		);
	}
}
