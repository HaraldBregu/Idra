import path from 'node:path';

import type { EventBus } from '../core/event-bus';
import { describeRagFile } from '../rag';
import type { IpcModule } from './ipc-module';
import type { MainServiceContainer } from '../service-registry';
import { RagChannels } from '../../shared/ipc-channels';
import {
	listMemoryGroupFiles,
	readMemoryGroupFile,
	searchMemoryGroupFiles,
} from './memory-group-files';
import { registerQuery } from './ipc-gateway';

export class RagIpc implements IpcModule {
	readonly name = 'rag';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const workspace = container.get('workspace');
		const group = {
			workspaceRoot: workspace.getRootPath(),
			rootRelativePath: path.join('memory', 'rag'),
			label: 'RAG',
			describe: describeRagFile,
		};

		registerQuery(RagChannels.list, () => listMemoryGroupFiles(group));
		registerQuery(RagChannels.read, (request) => readMemoryGroupFile(group, request));
		registerQuery(RagChannels.search, (request) => {
			return searchMemoryGroupFiles({
				workspaceRoot: workspace.getRootPath(),
				request,
				corpus: 'rag',
			});
		});
	}
}
