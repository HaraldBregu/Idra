import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import type {
	ConnectorConfig,
	ConnectorInput,
	ConnectorTool,
	ConnectorUpdateInput,
	ConnectorView,
} from '../../../../../shared/connectors';
import { AddConnectorDialog } from '../connectors/AddConnectorDialog';
import { ConnectorCard } from '../connectors/ConnectorCard';
import { ConnectorToolsList } from '../connectors/ConnectorToolsList';
import { EditConnectorDialog } from '../connectors/EditConnectorDialog';

const ConnectorsPage: React.FC = () => {
	const [connectors, setConnectors] = useState<ConnectorView[]>([]);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedTools, setSelectedTools] = useState<ConnectorTool[]>([]);
	const [editingConnector, setEditingConnector] = useState<ConnectorConfig | null>(null);
	const [editOpen, setEditOpen] = useState(false);

	const loadConnectors = useCallback(async (): Promise<void> => {
		try {
			setConnectors(await window.connectors.list());
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		}
	}, []);

	useEffect(() => {
		void loadConnectors();
	}, [loadConnectors]);

	const run = async (id: string, action: () => Promise<void>): Promise<void> => {
		setBusyId(id);
		setError(null);
		try {
			await action();
			await loadConnectors();
			if (selectedId === id) {
				setSelectedTools(await window.connectors.listTools(id));
			}
		} catch (actionError) {
			setError(actionError instanceof Error ? actionError.message : String(actionError));
		} finally {
			setBusyId(null);
		}
	};

	const addConnector = async (input: ConnectorInput): Promise<void> => {
		setError(null);
		try {
			await window.connectors.add(input);
			await loadConnectors();
		} catch (addError) {
			setError(addError instanceof Error ? addError.message : String(addError));
			throw addError;
		}
	};

	const saveConnector = async (id: string, input: ConnectorUpdateInput): Promise<void> => {
		await run(id, async () => {
			await window.connectors.update(id, input);
		});
	};

	const viewDetails = async (id: string): Promise<void> => {
		setSelectedId(id);
		setSelectedTools(await window.connectors.listTools(id));
	};

	const editConnector = async (id: string): Promise<void> => {
		setEditingConnector(await window.connectors.get(id));
		setEditOpen(true);
	};

	return (
		<div className="flex w-full flex-col gap-5 p-6">
			<section>
				<div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
					<div>
						<h2 className="text-sm font-semibold text-muted-foreground">Connectors</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Manage external tool providers available to Friday.
						</p>
					</div>
					<AddConnectorDialog onAdd={addConnector} />
				</div>

				{error && (
					<div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						<AlertTriangle className="mt-0.5 size-4 shrink-0" />
						<span>{error}</span>
					</div>
				)}

				{connectors.length === 0 ? (
					<Card className="gap-0 py-0">
						<CardContent className="p-6 text-sm text-muted-foreground">
							No connectors configured yet.
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4">
						{connectors.map((connector) => (
							<ConnectorCard
								key={connector.id}
								connector={connector}
								busy={busyId === connector.id}
								onToggle={() =>
									void run(connector.id, async () => {
										if (connector.enabled) {
											await window.connectors.disable(connector.id);
											return;
										}
										await window.connectors.enable(connector.id);
									})
								}
								onTest={() =>
									void run(connector.id, async () => {
										await window.connectors.test(connector.id);
									})
								}
								onReconnect={() =>
									void run(connector.id, async () => {
										await window.connectors.reconnect(connector.id);
										setSelectedTools(await window.connectors.listTools(connector.id));
										setSelectedId(connector.id);
									})
								}
								onRefreshTools={() =>
									void run(connector.id, async () => {
										setSelectedTools(await window.connectors.refreshTools(connector.id));
										setSelectedId(connector.id);
									})
								}
								onEdit={() => void editConnector(connector.id)}
								onRemove={() =>
									void run(connector.id, async () => {
										if (!window.confirm(`Remove ${connector.name}?`)) return;
										await window.connectors.remove(connector.id);
										if (selectedId === connector.id) {
											setSelectedId(null);
											setSelectedTools([]);
										}
									})
								}
								onViewDetails={() => void viewDetails(connector.id)}
							/>
						))}
					</div>
				)}
			</section>

			{selectedId && (
				<section className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-2 px-2">
						<h3 className="text-sm font-semibold text-muted-foreground">Tools</h3>
						<Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
							Close
						</Button>
					</div>
					<ConnectorToolsList tools={selectedTools} />
				</section>
			)}

			<EditConnectorDialog
				connector={editingConnector}
				open={editOpen}
				onOpenChange={setEditOpen}
				onSave={saveConnector}
			/>
		</div>
	);
};

export default ConnectorsPage;
