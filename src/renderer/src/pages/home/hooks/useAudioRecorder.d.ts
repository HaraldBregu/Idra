export type AudioRecorderStatus = 'idle' | 'checking-permission' | 'recording' | 'stopping' | 'error';
export type AudioRecorderPermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'disabled' | 'unsupported';
export type AudioRecording = {
    readonly id: string;
    readonly file: File;
    readonly url?: string;
    readonly durationMs: number;
    readonly mimeType: string;
    readonly size: number;
};
export declare function useAudioRecorder(): {
    cancel: () => Promise<void>;
    elapsedMs: number;
    errorMessage: string | null;
    isMuted: boolean;
    isSupported: boolean;
    permissionState: AudioRecorderPermissionState;
    setMuted: (nextMuted: boolean) => void;
    start: () => Promise<boolean>;
    status: AudioRecorderStatus;
    stream: MediaStream | null;
    stop: () => Promise<AudioRecording | null>;
};
