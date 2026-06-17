export type RealtimeDictationStatus = 'idle' | 'checking-permission' | 'connecting' | 'recording' | 'finishing' | 'error';
export declare function useRealtimeDictation({ value, onValueChange, }: {
    readonly value: string;
    readonly onValueChange: (value: string) => void;
}): {
    cancel: () => Promise<void>;
    elapsedMs: number;
    errorMessage: string | null;
    finish: () => Promise<void>;
    isMuted: boolean;
    isSupported: boolean;
    setMuted: (nextMuted: boolean) => void;
    start: () => Promise<boolean>;
    status: RealtimeDictationStatus;
    stream: MediaStream | null;
};
