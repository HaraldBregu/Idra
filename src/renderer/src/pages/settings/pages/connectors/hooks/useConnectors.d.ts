export declare function useConnectors(): {
    connectors: import("../../../../../../../shared").ConnectorSettingsRecord;
    error: string | null;
    setError: import("react").Dispatch<import("react").SetStateAction<string | null>>;
    load: () => Promise<void>;
};
