import path from 'node:path';

import type { EventBus } from '../core/event-bus';
import type { IpcModule } from './ipc-module';
import type { MainServiceContainer } from '../service-registry';
import { describeWikiFile } from '../wiki';
import { WikiChannels } from '../../shared/ipc-channels';
import {
	listMemoryGroupFiles,
	readMemoryGroupFile,
	searchMemoryGroupFiles,
} from './memory-group-files';
import { registerQuery } from './ipc-gateway';

export class WikiIpc implements IpcModule {
	readonly name = 'wiki';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const workspace = container.get('workspace');
		const group = {
			workspaceRoot: workspace.getRootPath(),
			rootRelativePath: path.join('memory', 'wiki'),
			label: 'wiki',
			describe: describeWikiFile,
		};

		registerQuery(WikiChannels.list, () => listMemoryGroupFiles(group));
		registerQuery(WikiChannels.read, (request) => readMemoryGroupFile(group, request));
		registerQuery(WikiChannels.search, (request) => {
			return searchMemoryGroupFiles({
				workspaceRoot: workspace.getRootPath(),
				request,
				corpus: 'wiki',
			});
		});
	}
}
