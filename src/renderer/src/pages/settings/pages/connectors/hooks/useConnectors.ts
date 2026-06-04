import { useEffect, useState } from 'react';
import type { ConnectorView } from '../../../../../../../shared/connector';

export function useConnectors() {
	const [connectors, setConnectors] = useState<ConnectorView[]>([]);
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
