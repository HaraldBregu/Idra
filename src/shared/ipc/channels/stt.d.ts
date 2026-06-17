import type { SttModelSelection, SttRealtimeEvent, SttRealtimeStartRequest, SttRealtimeSession, SttTranscriptionRequest, SttTranscriptionResult } from '../../stt/transcription';
import type { PublicProvider } from '../../providers';
import type { ProviderModel } from '../../providers/models/types';
export declare const SttChannels: {
    readonly appendRealtimeAudio: "stt:append-realtime-audio";
    readonly cancelRealtime: "stt:cancel-realtime";
    readonly finishRealtime: "stt:finish-realtime";
    readonly getSelection: "stt:get-selection";
    readonly listModels: "stt:list-models";
    readonly listProviders: "stt:list-providers";
    readonly realtimeEvent: "stt:realtime-event";
    readonly saveSelection: "stt:save-selection";
    readonly startRealtime: "stt:start-realtime";
    readonly transcribe: "stt:transcribe";
};
export interface SttInvokeChannelMap {
    [SttChannels.transcribe]: {
        args: [request: SttTranscriptionRequest];
        result: SttTranscriptionResult;
    };
    [SttChannels.startRealtime]: {
        args: [request: SttRealtimeStartRequest | undefined];
        result: SttRealtimeSession;
    };
    [SttChannels.appendRealtimeAudio]: {
        args: [sessionId: string, audio: string];
        result: void;
    };
    [SttChannels.finishRealtime]: {
        args: [sessionId: string];
        result: void;
    };
    [SttChannels.cancelRealtime]: {
        args: [sessionId: string];
        result: void;
    };
    [SttChannels.getSelection]: {
        args: [];
        result: SttModelSelection | undefined;
    };
    [SttChannels.listProviders]: {
        args: [];
        result: PublicProvider[];
    };
    [SttChannels.listModels]: {
        args: [providerId: string];
        result: ProviderModel[];
    };
    [SttChannels.saveSelection]: {
        args: [providerId: string, modelId: string];
        result: boolean;
    };
}
export interface SttEventChannelMap {
    [SttChannels.realtimeEvent]: {
        data: SttRealtimeEvent;
    };
}
