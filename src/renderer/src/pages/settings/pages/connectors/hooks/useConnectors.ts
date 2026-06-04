import { useEffect, useState } from 'react';

type ConnectorSummary = Awaited<ReturnType<typeof window.connectors.list>>[number];

export function useConnectors() {
	const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
	const [error, setError] = useState<string | null>(null);

	const load = async (): Promise<void> => {
		try {
			const nextConnectors = await window.connectors.list();
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
