import { useEffect, useState } from 'react';

type ConnectorRecord = Awaited<ReturnType<typeof window.agent.mcpList>>;

export function useConnectors() {
	const [connectors, setConnectors] = useState<ConnectorRecord>({});
	const [error, setError] = useState<string | null>(null);

	const load = async (): Promise<void> => {
		try {
			const nextConnectors = await window.agent.mcpList();
			setConnectors(nextConnectors);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	useEffect(() => {
		void load();
	}, []);

	return {
		connectors,
		error,
		setError,
		load,
	};
}
