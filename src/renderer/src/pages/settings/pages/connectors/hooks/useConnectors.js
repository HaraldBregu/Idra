import { useEffect, useState } from 'react';
export function useConnectors() {
    const [connectors, setConnectors] = useState({});
    const [error, setError] = useState(null);
    const load = async () => {
        try {
            const nextConnectors = await window.connectors.list();
            setConnectors(nextConnectors);
        }
        catch (err) {
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
