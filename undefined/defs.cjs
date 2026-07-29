"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/shared/provider_models_definitions.ts
var provider_models_definitions_exports = {};
__export(provider_models_definitions_exports, {
  CHAT_MODELS_BY_PROVIDER: () => CHAT_MODELS_BY_PROVIDER,
  DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID: () => DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID,
  DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID: () => DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID,
  DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID: () => DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID,
  DEFAULT_EMBEDDING_PROVIDER_ID: () => DEFAULT_EMBEDDING_PROVIDER_ID,
  ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID: () => ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
  ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID: () => ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID,
  ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID: () => ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID,
  EMBEDDING_MODELS_BY_PROVIDER: () => EMBEDDING_MODELS_BY_PROVIDER,
  EMBEDDING_PROVIDER_IDS: () => EMBEDDING_PROVIDER_IDS,
  GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID: () => GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID,
  IMAGE_CREATOR_MODELS: () => IMAGE_CREATOR_MODELS,
  IMAGE_CREATOR_MODELS_BY_PROVIDER: () => IMAGE_CREATOR_MODELS_BY_PROVIDER,
  LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS: () => LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS,
  LLM_MODELS_BY_PROVIDER: () => LLM_MODELS_BY_PROVIDER,
  LLM_PROVIDERS: () => LLM_PROVIDERS,
  MINI_SPEECH_TRANSCRIBER_MODEL_ID: () => MINI_SPEECH_TRANSCRIBER_MODEL_ID,
  MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID: () => MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
  MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID: () => MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
  MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID: () => MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID,
  MODEL_CAPABILITIES: () => MODEL_CAPABILITIES,
  MUSIC_CREATOR_MODELS: () => MUSIC_CREATOR_MODELS,
  MUSIC_CREATOR_MODELS_BY_PROVIDER: () => MUSIC_CREATOR_MODELS_BY_PROVIDER,
  MUSIC_MODELS_BY_PROVIDER: () => MUSIC_MODELS_BY_PROVIDER,
  MUSIC_PROVIDER_IDS: () => MUSIC_PROVIDER_IDS,
  OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID: () => OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
  OPENAI_SPEECH_TO_TEXT_PROVIDER_ID: () => OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
  QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID: () => QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
  QWEN_SPEECH_TO_TEXT_PROVIDER_ID: () => QWEN_SPEECH_TO_TEXT_PROVIDER_ID,
  REALTIME_VOICE_MODELS_BY_PROVIDER: () => REALTIME_VOICE_MODELS_BY_PROVIDER,
  RESEARCH_CHAT_MODELS_BY_PROVIDER: () => RESEARCH_CHAT_MODELS_BY_PROVIDER,
  SPEECH_TO_TEXT_API_TYPES: () => SPEECH_TO_TEXT_API_TYPES,
  SPEECH_TO_TEXT_BATCH_API_TYPE: () => SPEECH_TO_TEXT_BATCH_API_TYPE,
  SPEECH_TO_TEXT_MODELS: () => SPEECH_TO_TEXT_MODELS,
  SPEECH_TO_TEXT_MODELS_BY_PROVIDER: () => SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
  SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER: () => SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER,
  SPEECH_TO_TEXT_PROVIDER_BASE_URLS: () => SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
  SPEECH_TO_TEXT_PROVIDER_IDS: () => SPEECH_TO_TEXT_PROVIDER_IDS,
  SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES: () => SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES,
  SPEECH_TO_TEXT_STREAM_API_TYPE: () => SPEECH_TO_TEXT_STREAM_API_TYPE,
  SPEECH_TRANSCRIBER_MODEL_IDS: () => SPEECH_TRANSCRIBER_MODEL_IDS,
  SPEECH_TRANSCRIBER_PROVIDER_ID: () => SPEECH_TRANSCRIBER_PROVIDER_ID,
  STT_MODELS_BY_PROVIDER: () => STT_MODELS_BY_PROVIDER,
  TEXT_TO_AUDIO_MODELS_BY_PROVIDER: () => TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
  TEXT_TO_IMAGE_MODELS_BY_PROVIDER: () => TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
  TEXT_TO_IMAGE_PROVIDER_IDS: () => TEXT_TO_IMAGE_PROVIDER_IDS,
  TEXT_TO_SPEECH_MODELS: () => TEXT_TO_SPEECH_MODELS,
  TEXT_TO_SPEECH_MODELS_BY_PROVIDER: () => TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
  TEXT_TO_SPEECH_PROVIDER_ID: () => TEXT_TO_SPEECH_PROVIDER_ID,
  TEXT_TO_SPEECH_PROVIDER_IDS: () => TEXT_TO_SPEECH_PROVIDER_IDS,
  TEXT_TO_VIDEO_MODELS_BY_PROVIDER: () => TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
  TEXT_TO_VIDEO_PROVIDER_IDS: () => TEXT_TO_VIDEO_PROVIDER_IDS,
  TTS_MODELS_BY_PROVIDER: () => TTS_MODELS_BY_PROVIDER,
  VIDEO_CREATOR_MODELS_BY_PROVIDER: () => VIDEO_CREATOR_MODELS_BY_PROVIDER,
  XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID: () => XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
  XAI_SPEECH_TO_TEXT_PROVIDER_ID: () => XAI_SPEECH_TO_TEXT_PROVIDER_ID,
  XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID: () => XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID,
  cloneModels: () => cloneModels,
  getSpeechToTextModelApiTypes: () => getSpeechToTextModelApiTypes,
  isRealtimeSpeechToTextModel: () => isRealtimeSpeechToTextModel,
  isRealtimeVoiceModel: () => isRealtimeVoiceModel,
  isSpeechToTextProviderId: () => isSpeechToTextProviderId,
  mergeModelCatalogs: () => mergeModelCatalogs,
  model: () => model,
  normalizeProviderId: () => normalizeProviderId,
  supportsSpeechToTextModelApiType: () => supportsSpeechToTextModelApiType
});
module.exports = __toCommonJS(provider_models_definitions_exports);
var MODEL_CAPABILITIES = [
  "llm",
  "research-chat",
  "speech-to-text",
  "text-to-speech",
  "realtime-voice",
  "text-to-image",
  "text-to-audio",
  "music"
];
function model(id, name, status = "active") {
  return { id, name, status };
}
function mergeModelCatalogs(...catalogs) {
  return catalogs.reduce((merged, catalog) => {
    for (const [providerId, models] of Object.entries(catalog)) {
      merged[providerId] = [...merged[providerId] ?? [], ...models];
    }
    return merged;
  }, {});
}
function cloneModels(models) {
  return (models ?? []).map((model2) => ({ ...model2 }));
}
function normalizeProviderId(providerId) {
  return providerId.trim().toLowerCase();
}
var LLM_MODELS_BY_PROVIDER = {
  anthropic: [
    model("claude-fable-5", "Claude Fable 5"),
    model("claude-opus-5", "Claude Opus 5"),
    model("claude-sonnet-5", "Claude Sonnet 5"),
    model("claude-opus-4-7", "Claude Opus 4.7"),
    model("claude-sonnet-4-6", "Claude Sonnet 4.6"),
    model("claude-haiku-4-5-20251001", "Claude Haiku 4.5 20251001")
  ],
  deepseek: [
    model("deepseek-v4-pro", "DeepSeek V4 Pro"),
    model("deepseek-v4-flash", "DeepSeek V4 Flash")
  ],
  google: [
    model("gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview"),
    model("gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite")
  ],
  kimi: [
    model("kimi-k3", "Kimi K3"),
    model("kimi-k2.7-code", "Kimi K2.7 Code"),
    model("kimi-k2.7-code-highspeed", "Kimi K2.7 Code Highspeed"),
    model("kimi-k2.6", "Kimi K2.6"),
    model("kimi-k2.5", "Kimi K2.5")
  ],
  minimax: [model("MiniMax-M2.7", "MiniMax M2.7"), model("MiniMax-M2.5", "MiniMax M2.5")],
  mistral: [
    model("mistral-large-2512", "Mistral Large 2512"),
    model("mistral-medium-3-5", "Mistral Medium 3.5"),
    model("devstral-2512", "Devstral 2512")
  ],
  openai: [
    model("gpt-5.6-sol", "GPT-5.6 Sol"),
    model("gpt-5.6-terra", "GPT-5.6 Terra"),
    model("gpt-5.6-luna", "GPT-5.6 Luna"),
    model("gpt-5.5", "GPT-5.5"),
    model("gpt-5.5-pro", "GPT-5.5 Pro"),
    model("gpt-5.4", "GPT-5.4"),
    model("gpt-5.4-pro", "GPT-5.4 Pro"),
    model("gpt-5.4-mini", "GPT-5.4 Mini"),
    model("gpt-5.4-nano", "GPT-5.4 Nano")
  ],
  qwen: [
    model("qwen3.7-max", "Qwen3.7 Max"),
    model("qwen3.6-plus", "Qwen3.6 Plus"),
    model("qwen3.6-flash", "Qwen3.6 Flash")
  ],
  reka: [model("reka-flash", "Reka Flash"), model("reka-edge-2603", "Reka Edge 2603")],
  xai: [model("grok-4.3", "Grok 4.3"), model("grok-build-0.1", "Grok Build 0.1")],
  zai: [
    model("glm-5.1", "GLM-5.1"),
    model("glm-5", "GLM-5"),
    model("glm-5-turbo", "GLM-5 Turbo")
  ]
};
var LLM_PROVIDERS = Object.keys(LLM_MODELS_BY_PROVIDER);
var RESEARCH_CHAT_MODELS_BY_PROVIDER = {
  perplexity: [
    model("sonar-deep-research", "Sonar Deep Research"),
    model("sonar-reasoning-pro", "Sonar Reasoning Pro"),
    model("sonar-pro", "Sonar Pro"),
    model("sonar", "Sonar")
  ]
};
var CHAT_MODELS_BY_PROVIDER = mergeModelCatalogs(
  LLM_MODELS_BY_PROVIDER,
  RESEARCH_CHAT_MODELS_BY_PROVIDER
);
var DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID = "deepgram";
var ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID = "elevenlabs";
var MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID = "mistral";
var OPENAI_SPEECH_TO_TEXT_PROVIDER_ID = "openai";
var QWEN_SPEECH_TO_TEXT_PROVIDER_ID = "qwen";
var XAI_SPEECH_TO_TEXT_PROVIDER_ID = "xai";
var SPEECH_TRANSCRIBER_PROVIDER_ID = OPENAI_SPEECH_TO_TEXT_PROVIDER_ID;
var SPEECH_TO_TEXT_PROVIDER_IDS = [
  DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID,
  ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID,
  MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID,
  OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
  QWEN_SPEECH_TO_TEXT_PROVIDER_ID,
  XAI_SPEECH_TO_TEXT_PROVIDER_ID
];
var DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID = "nova-3";
var DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID = "flux-general-en";
var GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID = "gpt-4o-transcribe";
var MINI_SPEECH_TRANSCRIBER_MODEL_ID = "gpt-4o-mini-transcribe";
var OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID = "gpt-realtime-whisper";
var SPEECH_TRANSCRIBER_MODEL_IDS = [
  GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID,
  MINI_SPEECH_TRANSCRIBER_MODEL_ID,
  OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID
];
var LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS = [];
var MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID = "voxtral-mini-latest";
var MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID = "voxtral-mini-transcribe-realtime-2602";
var QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID = "qwen3-asr-flash-realtime";
var ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID = "scribe_v2";
var ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID = "scribe_v2_realtime";
var XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID = "xai-stt-batch";
var XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID = "xai-stt-streaming";
var SPEECH_TO_TEXT_PROVIDER_BASE_URLS = {
  [DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]: "https://api.deepgram.com/v1",
  [ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]: "https://api.elevenlabs.io/v1",
  [MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: "https://api.mistral.ai/v1",
  [OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: "https://api.openai.com/v1",
  [QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: "wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime",
  [XAI_SPEECH_TO_TEXT_PROVIDER_ID]: "https://api.x.ai/v1"
};
var SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES = {
  [DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]: 24e3,
  [ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]: 16e3,
  [MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: 16e3,
  [OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: 24e3,
  [QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: 16e3,
  [XAI_SPEECH_TO_TEXT_PROVIDER_ID]: 24e3
};
var SPEECH_TO_TEXT_BATCH_API_TYPE = "batch";
var SPEECH_TO_TEXT_STREAM_API_TYPE = "stream";
var SPEECH_TO_TEXT_API_TYPES = [
  SPEECH_TO_TEXT_BATCH_API_TYPE,
  SPEECH_TO_TEXT_STREAM_API_TYPE
];
var SPEECH_TO_TEXT_MODELS_BY_PROVIDER = {
  [DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]: [
    model(DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID, "Nova 3"),
    model(DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID, "Flux")
  ],
  [ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]: [
    model(ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID, "Scribe v2"),
    model(ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID, "Scribe v2 Realtime")
  ],
  [MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: [
    model(MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID, "Voxtral Mini 2602"),
    model(MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID, "Voxtral Mini Transcribe Realtime 2602")
  ],
  [OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: [
    model(GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID, "GPT-4o Transcribe"),
    model(MINI_SPEECH_TRANSCRIBER_MODEL_ID, "GPT-4o Mini Transcribe"),
    model(OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID, "GPT Realtime Whisper")
  ],
  [QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: [
    model(QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID, "Qwen3 ASR Flash Realtime")
  ],
  [XAI_SPEECH_TO_TEXT_PROVIDER_ID]: [
    model(XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID, "xAI STT Batch"),
    model(XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID, "xAI STT Streaming")
  ]
};
var SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER = {
  [DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]: {
    [DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID]: [
      SPEECH_TO_TEXT_BATCH_API_TYPE,
      SPEECH_TO_TEXT_STREAM_API_TYPE
    ],
    [DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE]
  },
  [ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]: {
    [ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
    [ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE]
  },
  [MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: {
    [MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
    [MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE]
  },
  [OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: {
    [GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
    [MINI_SPEECH_TRANSCRIBER_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
    [OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE]
  },
  [QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: {
    [QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE]
  },
  [XAI_SPEECH_TO_TEXT_PROVIDER_ID]: {
    [XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
    [XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE]
  }
};
var STT_MODELS_BY_PROVIDER = SPEECH_TO_TEXT_MODELS_BY_PROVIDER;
var SPEECH_TO_TEXT_MODELS = SPEECH_TO_TEXT_MODELS_BY_PROVIDER[SPEECH_TRANSCRIBER_PROVIDER_ID];
function resolveSpeechToTextProviderId(providerId) {
  const normalizedProviderId = normalizeProviderId(providerId);
  return SPEECH_TO_TEXT_PROVIDER_IDS.includes(normalizedProviderId) ? normalizedProviderId : null;
}
function isSpeechToTextProviderId(providerId) {
  return resolveSpeechToTextProviderId(providerId) !== null;
}
function getSpeechToTextModelApiTypes(providerId, modelId) {
  const provider = resolveSpeechToTextProviderId(providerId);
  if (!provider) return [];
  return SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER[provider][modelId.trim()] ?? [];
}
function supportsSpeechToTextModelApiType(providerId, modelId, apiType) {
  return getSpeechToTextModelApiTypes(providerId, modelId).includes(apiType);
}
function isRealtimeSpeechToTextModel(providerId, modelId) {
  const provider = normalizeProviderId(providerId);
  const model2 = modelId.trim();
  if (provider === DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID) {
    return model2 === DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID;
  }
  if (provider === SPEECH_TRANSCRIBER_PROVIDER_ID) {
    return model2 === OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
  }
  if (provider === ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID) {
    return model2 === ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
  }
  if (provider === MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID) {
    return model2 === MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
  }
  if (provider === QWEN_SPEECH_TO_TEXT_PROVIDER_ID) {
    return model2 === QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
  }
  if (provider === XAI_SPEECH_TO_TEXT_PROVIDER_ID) {
    return model2 === XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID;
  }
  return false;
}
var TEXT_TO_SPEECH_PROVIDER_ID = "elevenlabs";
var TEXT_TO_SPEECH_MODELS_BY_PROVIDER = {
  cartesia: [model("sonic-3.5", "Sonic 3.5"), model("sonic-3", "Sonic 3")],
  deepgram: [model("aura-2", "Aura 2")],
  elevenlabs: [
    model("eleven_v3", "Eleven v3"),
    model("eleven_multilingual_v2", "Eleven Multilingual v2"),
    model("eleven_flash_v2_5", "Eleven Flash v2.5")
  ],
  google: [model("gemini-3.1-flash-tts-preview", "Gemini 3.1 Flash TTS Preview")],
  minimax: [model("speech-2.8-hd", "Speech 2.8 HD"), model("speech-2.8-turbo", "Speech 2.8 Turbo")],
  mistral: [model("voxtral-mini-tts-2603", "Voxtral Mini TTS 2603")],
  openai: [model("gpt-4o-mini-tts", "GPT-4o Mini TTS"), model("tts-1-hd", "TTS-1 HD")]
};
var TTS_MODELS_BY_PROVIDER = TEXT_TO_SPEECH_MODELS_BY_PROVIDER;
var TEXT_TO_SPEECH_MODELS = TEXT_TO_SPEECH_MODELS_BY_PROVIDER[TEXT_TO_SPEECH_PROVIDER_ID];
var TEXT_TO_SPEECH_PROVIDER_IDS = [
  "cartesia",
  "deepgram",
  "elevenlabs",
  "google",
  "minimax",
  "mistral",
  "openai"
];
var EMBEDDING_MODELS_BY_PROVIDER = {
  bge: [model("bge-m3", "BGE-M3")],
  cohere: [model("embed-v4.0", "Embed v4")],
  jina: [model("jina-embeddings-v3", "Jina Embeddings v3")],
  nomic: [model("nomic-embed-text-v2-moe", "Nomic Embed v2")],
  openai: [
    model("text-embedding-3-large", "Text Embedding 3 Large"),
    model("text-embedding-3-small", "Text Embedding 3 Small")
  ],
  voyage: [model("voyage-3-large", "Voyage 3 Large")]
};
var EMBEDDING_PROVIDER_IDS = [
  "bge",
  "cohere",
  "jina",
  "nomic",
  "openai",
  "voyage"
];
var DEFAULT_EMBEDDING_PROVIDER_ID = "openai";
var TEXT_TO_IMAGE_MODELS_BY_PROVIDER = {
  "black-forest-labs": [
    model("FLUX.2", "FLUX.2"),
    model("FLUX.1 Kontext [pro]", "FLUX.1 Kontext [pro]"),
    model("FLUX1.1 [pro] Ultra", "FLUX1.1 [pro] Ultra")
  ],
  google: [
    model("gemini-3.1-flash-image-preview", "Gemini 3.1 Flash Image Preview"),
    model("gemini-3-pro-image-preview", "Gemini 3 Pro Image Preview")
  ],
  ideogram: [model("ideogram-3.0", "Ideogram 3.0"), model("ideogram-2a", "Ideogram 2a")],
  luma: [model("uni-1.1", "Uni 1.1")],
  midjourney: [
    model("midjourney-v8.1", "Midjourney v8.1"),
    model("midjourney-v7", "Midjourney v7")
  ],
  qwen: [model("qwen-image", "Qwen Image"), model("qwen-image-edit", "Qwen Image Edit")],
  "stability-ai": [
    model("stable-image-ultra", "Stable Image Ultra"),
    model("stable-image-core", "Stable Image Core")
  ],
  xai: [
    model("grok-imagine-image", "Grok Imagine Image"),
    model("grok-imagine-image-quality", "Grok Imagine Image Quality")
  ]
};
var IMAGE_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_IMAGE_MODELS_BY_PROVIDER;
var IMAGE_CREATOR_MODELS = TEXT_TO_IMAGE_MODELS_BY_PROVIDER.google;
var TEXT_TO_IMAGE_PROVIDER_IDS = [
  "black-forest-labs",
  "google",
  "ideogram",
  "luma",
  "midjourney",
  "qwen",
  "stability-ai",
  "xai"
];
var TEXT_TO_VIDEO_MODELS_BY_PROVIDER = {
  google: [model("veo-3.1", "Veo 3.1"), model("veo-3.1-fast", "Veo 3.1 Fast")],
  kling: [
    model("kling-v2.5-turbo", "Kling v2.5 Turbo"),
    model("kling-v2.1-master", "Kling v2.1 Master")
  ],
  luma: [model("ray-3", "Ray 3"), model("ray-2", "Ray 2")],
  midjourney: [model("midjourney-video-v1", "Midjourney Video v1")],
  minimax: [
    model("MiniMax-Hailuo-2.3", "Hailuo 2.3"),
    model("MiniMax-Hailuo-02", "Hailuo 02")
  ],
  pika: [model("pika-2.2", "Pika 2.2")],
  qwen: [model("wan2.5-t2v", "Wan 2.5 T2V"), model("wan2.2-t2v-plus", "Wan 2.2 T2V Plus")],
  runway: [model("gen4_turbo", "Gen-4 Turbo"), model("gen3a_turbo", "Gen-3 Alpha Turbo")],
  xai: [model("grok-imagine-video-1.5", "Grok Imagine Video 1.5")]
};
var VIDEO_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_VIDEO_MODELS_BY_PROVIDER;
var TEXT_TO_VIDEO_PROVIDER_IDS = [
  "google",
  "kling",
  "luma",
  "midjourney",
  "minimax",
  "pika",
  "qwen",
  "runway",
  "xai"
];
var TEXT_TO_AUDIO_MODELS_BY_PROVIDER = {
  elevenlabs: [
    model("eleven-music", "Eleven Music"),
    model("elevenlabs-sound-effects", "ElevenLabs Sound Effects")
  ],
  google: [
    model("lyria-3-pro-preview", "Lyria 3 Pro Preview"),
    model("lyria-3-clip-preview", "Lyria 3 Clip Preview"),
    model("lyria-realtime", "Lyria Realtime")
  ],
  kling: [model("kling-audio", "Kling Audio")],
  minimax: [model("music-2.6", "Music 2.6"), model("music-cover", "Music Cover")],
  "stability-ai": [model("stable-audio-2.5", "Stable Audio 2.5")],
  suno: [model("suno-v5.5", "Suno v5.5"), model("suno-v4.5-all", "Suno v4.5 All")]
};
var MUSIC_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_AUDIO_MODELS_BY_PROVIDER;
var MUSIC_MODELS_BY_PROVIDER = TEXT_TO_AUDIO_MODELS_BY_PROVIDER;
var MUSIC_CREATOR_MODELS = TEXT_TO_AUDIO_MODELS_BY_PROVIDER.google;
var MUSIC_PROVIDER_IDS = [
  "elevenlabs",
  "google",
  "kling",
  "minimax",
  "stability-ai",
  "suno"
];
var REALTIME_VOICE_MODELS_BY_PROVIDER = {
  google: [model("gemini-3.1-flash-live-preview", "Gemini 3.1 Flash Live Preview")],
  luma: [model("uni-1.1", "Uni 1.1")],
  qwen: [
    model("qwen-omni-realtime", "Qwen Omni Realtime"),
    model("qwen3.5-omni", "Qwen3.5 Omni"),
    model("qwen3-omni-flash", "Qwen3 Omni Flash")
  ],
  xai: [model("grok-voice-latest", "Grok Voice Latest")]
};
function isRealtimeVoiceModel(providerId, modelId) {
  const catalog = REALTIME_VOICE_MODELS_BY_PROVIDER;
  return (catalog[normalizeProviderId(providerId)] ?? []).some((m) => m.id === modelId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CHAT_MODELS_BY_PROVIDER,
  DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID,
  DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID,
  DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID,
  DEFAULT_EMBEDDING_PROVIDER_ID,
  ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
  ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID,
  ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID,
  EMBEDDING_MODELS_BY_PROVIDER,
  EMBEDDING_PROVIDER_IDS,
  GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID,
  IMAGE_CREATOR_MODELS,
  IMAGE_CREATOR_MODELS_BY_PROVIDER,
  LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS,
  LLM_MODELS_BY_PROVIDER,
  LLM_PROVIDERS,
  MINI_SPEECH_TRANSCRIBER_MODEL_ID,
  MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
  MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
  MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID,
  MODEL_CAPABILITIES,
  MUSIC_CREATOR_MODELS,
  MUSIC_CREATOR_MODELS_BY_PROVIDER,
  MUSIC_MODELS_BY_PROVIDER,
  MUSIC_PROVIDER_IDS,
  OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
  OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
  QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
  QWEN_SPEECH_TO_TEXT_PROVIDER_ID,
  REALTIME_VOICE_MODELS_BY_PROVIDER,
  RESEARCH_CHAT_MODELS_BY_PROVIDER,
  SPEECH_TO_TEXT_API_TYPES,
  SPEECH_TO_TEXT_BATCH_API_TYPE,
  SPEECH_TO_TEXT_MODELS,
  SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
  SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER,
  SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
  SPEECH_TO_TEXT_PROVIDER_IDS,
  SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES,
  SPEECH_TO_TEXT_STREAM_API_TYPE,
  SPEECH_TRANSCRIBER_MODEL_IDS,
  SPEECH_TRANSCRIBER_PROVIDER_ID,
  STT_MODELS_BY_PROVIDER,
  TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
  TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
  TEXT_TO_IMAGE_PROVIDER_IDS,
  TEXT_TO_SPEECH_MODELS,
  TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
  TEXT_TO_SPEECH_PROVIDER_ID,
  TEXT_TO_SPEECH_PROVIDER_IDS,
  TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
  TEXT_TO_VIDEO_PROVIDER_IDS,
  TTS_MODELS_BY_PROVIDER,
  VIDEO_CREATOR_MODELS_BY_PROVIDER,
  XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
  XAI_SPEECH_TO_TEXT_PROVIDER_ID,
  XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID,
  cloneModels,
  getSpeechToTextModelApiTypes,
  isRealtimeSpeechToTextModel,
  isRealtimeVoiceModel,
  isSpeechToTextProviderId,
  mergeModelCatalogs,
  model,
  normalizeProviderId,
  supportsSpeechToTextModelApiType
});
