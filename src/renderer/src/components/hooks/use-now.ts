import * as React from 'react';

function useNow(active: boolean, intervalMs = 100): number {
	const [now, setNow] = React.useState(() => Date.now());

	React.useEffect(() => {
		if (!active) return;
		const id = window.setInterval(() => setNow(Date.now()), intervalMs);
		return () => window.clearInterval(id);
	}, [active, intervalMs]);

	return now;
}

export { useNow };
