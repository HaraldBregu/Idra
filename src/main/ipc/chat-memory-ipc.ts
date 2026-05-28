import path from 'node:path';

import type { EventBus } from '../core/event-bus';
import { resolveChatMemoryScope, describeChatMemoryFile } from '../memory/chat';
import type { IpcModule } from './ipc-module';
import type { MainServiceContainer } from '../service-registry';
import { ChatMemoryChannels } from '../../shared/ipc-channels';
import {
	listMemoryGroupFiles,
	parseChatMemoryListRequest,
	readMemoryGroupFile,
	searchMemoryGroupFiles,
} from './memory-group-files';
import { registerQuery } from './ipc-gateway';

export class ChatMemoryIpc implements IpcModule {
	readonly name = 'chat-memory';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const workspace = container.get('workspace');

		registerQuery(ChatMemoryChannels.list, (rawRequest) => {
			const request = parseChatMemoryListRequest(rawRequest);
			const rootRelativePath = request.scopeId
				? resolveChatMemoryScope({ kind: 'chat', id: request.scopeId }).relativeDir
				: path.join('memory', 'chats');
			return listMemoryGroupFiles({
				workspaceRoot: workspace.getRootPath(),
				rootRelativePath,
				label: 'chat',
				describe: describeChatMemoryFile,
			});
		});

		registerQuery(ChatMemoryChannels.read, (request) => {
			return readMemoryGroupFile(
				{
					workspaceRoot: workspace.getRootPath(),
					rootRelativePath: path.join('memory', 'chats'),
					label: 'chat',
					describe: describeChatMemoryFile,
				},
				request
			);
		});

		registerQuery(ChatMemoryChannels.search, (request) => {
			return searchMemoryGroupFiles({
				workspaceRoot: workspace.getRootPath(),
				request,
				corpus: 'memory',
				scopeKind: 'chat',
			});
		});
	}
}
