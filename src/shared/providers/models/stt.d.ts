export declare const DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID = "deepgram";
export declare const ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID = "elevenlabs";
export declare const MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID = "mistral";
export declare const OPENAI_SPEECH_TO_TEXT_PROVIDER_ID = "openai";
export declare const QWEN_SPEECH_TO_TEXT_PROVIDER_ID = "qwen";
export declare const XAI_SPEECH_TO_TEXT_PROVIDER_ID = "xai";
export declare const SPEECH_TRANSCRIBER_PROVIDER_ID = "openai";
export declare const SPEECH_TO_TEXT_PROVIDER_IDS: readonly ["deepgram", "elevenlabs", "mistral", "openai", "qwen", "xai"];
export type SpeechToTextProviderId = (typeof SPEECH_TO_TEXT_PROVIDER_IDS)[number];
export declare const DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID = "nova-3";
export declare const DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID = "flux-general-en";
export declare const GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID = "gpt-4o-transcribe";
export declare const MINI_SPEECH_TRANSCRIBER_MODEL_ID = "gpt-4o-mini-transcribe";
export declare const OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID = "gpt-realtime-whisper";
export declare const SPEECH_TRANSCRIBER_MODEL_IDS: readonly ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "gpt-realtime-whisper"];
export declare const LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS: readonly [];
export declare const MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID = "voxtral-mini-latest";
export declare const MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID = "voxtral-mini-transcribe-realtime-2602";
export declare const QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID = "qwen3-asr-flash-realtime";
export declare const ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID = "scribe_v2";
export declare const ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID = "scribe_v2_realtime";
export declare const XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID = "xai-stt-batch";
export declare const XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID = "xai-stt-streaming";
export declare const SPEECH_TO_TEXT_PROVIDER_BASE_URLS: {
    readonly deepgram: "https://api.deepgram.com/v1";
    readonly elevenlabs: "https://api.elevenlabs.io/v1";
    readonly mistral: "https://api.mistral.ai/v1";
    readonly openai: "https://api.openai.com/v1";
    readonly qwen: "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime";
    readonly xai: "https://api.x.ai/v1";
};
export declare const SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES: {
    readonly deepgram: 24000;
    readonly elevenlabs: 16000;
    readonly mistral: 16000;
    readonly openai: 24000;
    readonly qwen: 16000;
    readonly xai: 24000;
};
export declare const SPEECH_TO_TEXT_BATCH_API_TYPE = "batch";
export declare const SPEECH_TO_TEXT_STREAM_API_TYPE = "stream";
export declare const SPEECH_TO_TEXT_API_TYPES: readonly ["batch", "stream"];
export type SpeechToTextApiType = (typeof SPEECH_TO_TEXT_API_TYPES)[number];
export declare const SPEECH_TO_TEXT_MODELS_BY_PROVIDER: {
    readonly deepgram: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly elevenlabs: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly mistral: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly openai: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly qwen: readonly [import("./types").ProviderModel];
    readonly xai: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
};
export declare const SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER: {
    readonly deepgram: {
        readonly "nova-3": readonly ["batch", "stream"];
        readonly "flux-general-en": readonly ["stream"];
    };
    readonly elevenlabs: {
        readonly scribe_v2: readonly ["batch"];
        readonly scribe_v2_realtime: readonly ["stream"];
    };
    readonly mistral: {
        readonly "voxtral-mini-latest": readonly ["batch"];
        readonly "voxtral-mini-transcribe-realtime-2602": readonly ["stream"];
    };
    readonly openai: {
        readonly "gpt-4o-transcribe": readonly ["batch"];
        readonly "gpt-4o-mini-transcribe": readonly ["batch"];
        readonly "gpt-realtime-whisper": readonly ["stream"];
    };
    readonly qwen: {
        readonly "qwen3-asr-flash-realtime": readonly ["stream"];
    };
    readonly xai: {
        readonly "xai-stt-batch": readonly ["batch"];
        readonly "xai-stt-streaming": readonly ["stream"];
    };
};
export declare const STT_MODELS_BY_PROVIDER: {
    readonly deepgram: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly elevenlabs: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly mistral: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
    readonly openai: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
    readonly qwen: readonly [import("./types").ProviderModel];
    readonly xai: readonly [import("./types").ProviderModel, import("./types").ProviderModel];
};
export declare const SPEECH_TO_TEXT_MODELS: readonly [import("./types").ProviderModel, import("./types").ProviderModel, import("./types").ProviderModel];
export declare function isSpeechToTextProviderId(providerId: string): providerId is SpeechToTextProviderId;
export declare function getSpeechToTextModelApiTypes(providerId: string, modelId: string): readonly SpeechToTextApiType[];
export declare function supportsSpeechToTextModelApiType(providerId: string, modelId: string, apiType: SpeechToTextApiType): boolean;
export declare function isRealtimeSpeechToTextModel(providerId: string, modelId: string): boolean;
