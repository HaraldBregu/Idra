import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { registerCommand, registerCommandWithEvent, registerQuery } from './ipc-gateway';
import { SkillsChannels } from '../../shared/ipc-channels';

export class SkillsIpc implements IpcModule {
	readonly name = 'skills';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const skills = container.get('skills');

		registerQuery(SkillsChannels.list, () => skills.list());
		registerQuery(SkillsChannels.getRoot, () => skills.getSkillsRoot());

		registerCommandWithEvent(SkillsChannels.import, async (event) => {
			const parent = BrowserWindow.fromWebContents(event.sender);
			const options: OpenDialogOptions = {
				title: 'Upload Skill',
				buttonLabel: 'Upload Skill',
				properties: ['openDirectory'],
			};
			const result = parent
				? await dialog.showOpenDialog(parent, options)
				: await dialog.showOpenDialog(options);

			if (result.canceled || result.filePaths.length === 0) {
				return undefined;
			}

			return skills.importFromPath(result.filePaths[0]);
		});

		registerCommandWithEvent(SkillsChannels.download, async (event, id) => {
			const parent = BrowserWindow.fromWebContents(event.sender);
			const options: OpenDialogOptions = {
				title: 'Download Skill',
				buttonLabel: 'Download Skill',
				properties: ['openDirectory', 'createDirectory'],
			};
			const result = parent
				? await dialog.showOpenDialog(parent, options)
				: await dialog.showOpenDialog(options);

			if (result.canceled || result.filePaths.length === 0) {
				return undefined;
			}

			return skills.downloadToPath(id, result.filePaths[0]);
		});

		registerCommand(SkillsChannels.delete, (id: string) => skills.delete(id));
	}
}
