import { BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { DataChannels } from '../../shared/ipc_channels_definitions';
import type { DataScope } from '../../shared/data_types';
import type { Agent } from '../agent/agent';
import { DataController } from '../data/data_controller';
import { normalizeDataScope } from '../data/data_scope';
import type { EventBus } from '../event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export interface DataIpcDeps {
	agent: Agent;
}

export class DataIpc implements IpcModule<DataIpcDeps> {
	readonly name = 'data';

	register({ agent }: DataIpcDeps, _eventBus: EventBus): void {
		const controller = new DataController(agent);
		registerQuery(DataChannels.listScopes, () => controller.listScopes());
		registerCommand(DataChannels.export, async (input) => {
			const scope = normalizeDataScope(input);
			const options = {
				title: 'Export Idra data',
				defaultPath: `${this.fileName(scope)}.json`,
				filters: [{ name: 'Idra data export', extensions: ['json'] }],
			};
			const window = BrowserWindow.getFocusedWindow();
			const result = await (window
				? dialog.showSaveDialog(window, options)
				: dialog.showSaveDialog(options));
			if (result.canceled || !result.filePath) return undefined;
			return controller.export(scope, path.resolve(result.filePath));
		});
		registerQuery(DataChannels.previewPurge, (input) => {
			return controller.previewPurge(normalizeDataScope(input));
		});
		registerCommand(DataChannels.purge, async (input, confirmationId) => {
			const scope = normalizeDataScope(input);
			const remoteNamespace =
				scope.kind === 'rag' &&
				(scope.mode === 'remote_namespace' || scope.mode === 'remote_all_namespaces');
			if (typeof confirmationId !== 'string' || !confirmationId.trim()) {
				throw new Error('A purge confirmation ID is required.');
			}
			const options = {
				type: 'warning' as const,
				buttons: ['Cancel', remoteNamespace ? 'Purge remote namespace' : 'Purge local data'],
				cancelId: 0,
				defaultId: 0,
				noLink: true,
				message: remoteNamespace
					? 'Permanently purge the selected remote data?'
					: 'Permanently purge the selected local data?',
				detail: `${this.scopeDescription(scope)}\n\n${
					remoteNamespace
						? scope.kind === 'rag' && scope.mode === 'remote_all_namespaces'
							? 'Every Idra-owned namespace in this Pinecone index will be deleted. The index and unrelated namespaces will remain.'
							: 'Only this exact remote namespace will be deleted. The Pinecone index will remain.'
						: 'Remote provider data will not be deleted.'
				}`,
			};
			const window = BrowserWindow.getFocusedWindow();
			const result = await (window
				? dialog.showMessageBox(window, options)
				: dialog.showMessageBox(options));
			if (result.response !== 1) return undefined;
			return controller.purge(scope, confirmationId.trim());
		});
	}

	private fileName(scope: DataScope): string {
		if (scope.kind === 'sessions') return 'idra-sessions-export';
		if (scope.kind === 'wiki') return 'idra-wiki-export';
		if (scope.kind === 'memory') return 'idra-memory-export';
		return `idra-rag-${scope.indexName}-export`;
	}

	private scopeDescription(scope: DataScope): string {
		if (scope.kind === 'sessions') return `Sessions: ${scope.sessionIds.join(', ')}`;
		if (scope.kind === 'wiki') return `Managed wiki target: ${scope.targetPath}`;
		if (scope.kind === 'memory') return 'Persistent memory: all saved facts';
		if (scope.mode === 'local_namespace') {
			return `Local RAG namespace: ${scope.indexName} / ${scope.generation}`;
		}
		if (scope.mode === 'remote_namespace') {
			return `Remote Pinecone namespace: ${scope.indexName} / ${scope.generation}`;
		}
		if (scope.mode === 'remote_all_namespaces') {
			return `All Idra-owned remote Pinecone namespaces in ${scope.indexName}`;
		}
		return `Local RAG index: ${scope.indexName} (all local namespaces)`;
	}
}
