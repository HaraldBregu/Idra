import { useCallback, useEffect, useState } from 'react';
import type { ConnectorCatalogEntry, ConnectorTool, ConnectorView } from '../../../../../../../shared/connector';

export type ConnectorCatalog = readonly ConnectorCatalogEntry[];

export function useConnectors() {
	const [catalog, setCatalog] = useState<ConnectorCatalog>([]);
	const [connectors, setConnectors] = useState<ConnectorView[]>([]);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedTools, setSelectedTools] = useState<ConnectorTool[]>([]);

	const load = useCallback(async (): Promise<void> => {
		try {
			const [nextCatalog, nextConnectors] = await Promise.all([
				window.connectors.catalog(),
				window.connectors.list(),
			]);
			setCatalog(nextCatalog);
			setConnectors(nextConnectors);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const run = async (id: string, action: () => Promise<unknown>): Promise<void> => {
		setBusyId(id);
		setError(null);
		setStatusMessage(null);
		try {
			await action();
			await load();
			if (selectedId === id) {
				setSelectedTools(await window.connectors.listTools(id));
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusyId(null);
		}
	};

	const toggleConnector = (connector: ConnectorView): Promise<void> =>
		run(connector.id, () =>
			connector.enabled
				? window.connectors.disable(connector.id)
				: window.connectors.enable(connector.id)
		);

	const refreshTools = (connectorId: string): Promise<void> =>
		run(connectorId, async () => {
			const tools = await window.connectors.refreshTools(connectorId);
			setSelectedTools(tools);
			setSelectedId(connectorId);
		});


	const removeConnector = (connector: ConnectorView): Promise<void> =>
		run(connector.id, async () => {
			if (!window.confirm(`Remove ${connector.name}?`)) return;
			await window.connectors.remove(connector.id);
			if (selectedId === connector.id) {
				setSelectedId(null);
				setSelectedTools([]);
			}
		});

	const viewDetails = async (id: string): Promise<void> => {
		setSelectedId(id);
		setSelectedTools(await window.connectors.listTools(id));
	};

	const clearSelection = (): void => {
		setSelectedId(null);
		setSelectedTools([]);
	};

	return {
		catalog,
		connectors,
		busyId,
		error,
		setError,
		statusMessage,
		selectedId,
		selectedTools,
		load,
		toggleConnector,
		refreshTools,
		removeConnector,
		viewDetails,
		clearSelection,
	};
}
