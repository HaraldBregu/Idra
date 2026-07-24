import { useEffect, useState } from 'react';

type ConnectorRecord = Awaited<ReturnType<typeof window.mcp.list>>;

export function useMcpServers() {
	const [servers, setServers] = useState<ConnectorRecord>({});
	const [error, setError] = useState<string | null>(null);

	const load = async (): Promise<void> => {
		try {
			const nextServers = await window.mcp.list();
			setServers(nextServers);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	useEffect(() => {
		void load();
	}, []);

	return {
		servers,
		error,
		setError,
		load,
	};
}
