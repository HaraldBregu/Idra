export interface ProviderApiConfiguration {
    readonly credentialType: string | null;
    readonly apiKeyManagementUrl: string | null;
    readonly configurationDocsUrl: string | null;
    readonly authMethod: string | null;
    readonly recommendedEnvVars: readonly string[];
    readonly baseUrls: readonly string[];
    readonly importantNotes: readonly string[];
}
export interface Provider {
    readonly id: string;
    readonly name: string;
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly capabilities?: string;
    readonly apiConfiguration?: ProviderApiConfiguration;
}
export type PublicProvider = Omit<Provider, 'apiKey'>;
export type ProviderInput = Provider;
export declare const PROVIDER_API_CONFIGURATIONS: {
    readonly openai: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://platform.openai.com/api-keys";
        readonly configurationDocsUrl: "https://developers.openai.com/api/docs/quickstart";
        readonly authMethod: "HTTP Bearer token";
        readonly recommendedEnvVars: readonly ["OPENAI_API_KEY"];
        readonly baseUrls: readonly ["https://api.openai.com/v1"];
        readonly importantNotes: readonly ["Create/export the key before calling the API.", "Keep server-side; do not expose in browser or client apps."];
    };
    readonly anthropic: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://console.anthropic.com/settings/keys";
        readonly configurationDocsUrl: "https://platform.claude.com/docs/en/api/overview";
        readonly authMethod: "x-api-key header plus anthropic-version header";
        readonly recommendedEnvVars: readonly ["ANTHROPIC_API_KEY"];
        readonly baseUrls: readonly ["https://api.anthropic.com"];
        readonly importantNotes: readonly ["Official SDKs handle the required headers automatically.", "Keys are generated in the Anthropic Console."];
    };
    readonly google: {
        readonly credentialType: "Gemini API key / Google Cloud credentials depending on service";
        readonly apiKeyManagementUrl: "https://aistudio.google.com/app/apikey";
        readonly configurationDocsUrl: "https://ai.google.dev/gemini-api/docs/api-key";
        readonly authMethod: "API key parameter/header for Gemini Developer API; Google Cloud IAM/auth for Vertex/Cloud APIs";
        readonly recommendedEnvVars: readonly ["GEMINI_API_KEY", "GOOGLE_API_KEY"];
        readonly baseUrls: readonly ["https://generativelanguage.googleapis.com"];
        readonly importantNotes: readonly ["Use Google AI Studio for Gemini API keys.", "For Vertex AI or Cloud Speech/Text-to-Speech, prefer Google Cloud project credentials and IAM."];
    };
    readonly meta: {
        readonly credentialType: "Llama API key";
        readonly apiKeyManagementUrl: "https://llama.developer.meta.com/";
        readonly configurationDocsUrl: "https://llama.developer.meta.com/docs/api-keys/";
        readonly authMethod: "API key authentication";
        readonly recommendedEnvVars: readonly ["LLAMA_API_KEY"];
        readonly baseUrls: readonly [];
        readonly importantNotes: readonly ["Meta Llama API has its own API-key dashboard; availability may depend on preview/rollout access."];
    };
    readonly xai: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://console.x.ai/";
        readonly configurationDocsUrl: "https://docs.x.ai/developers/quickstart";
        readonly authMethod: "HTTP Bearer token";
        readonly recommendedEnvVars: readonly ["XAI_API_KEY"];
        readonly baseUrls: readonly ["https://api.x.ai/v1"];
        readonly importantNotes: readonly ["Generate key in the xAI console/API Keys page, then export XAI_API_KEY."];
    };
    readonly mistral: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://admin.mistral.ai/organization/api-keys";
        readonly configurationDocsUrl: "https://docs.mistral.ai/getting-started/quickstarts";
        readonly authMethod: "HTTP Bearer token";
        readonly recommendedEnvVars: readonly ["MISTRAL_API_KEY"];
        readonly baseUrls: readonly ["https://api.mistral.ai/v1"];
        readonly importantNotes: readonly ["Create keys in La Plateforme/admin console; use the same key across Mistral API calls subject to account permissions."];
    };
    readonly deepseek: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://platform.deepseek.com/api_keys";
        readonly configurationDocsUrl: "https://api-docs.deepseek.com/";
        readonly authMethod: "OpenAI-compatible Bearer token";
        readonly recommendedEnvVars: readonly ["DEEPSEEK_API_KEY"];
        readonly baseUrls: readonly ["https://api.deepseek.com"];
        readonly importantNotes: readonly ["DeepSeek API is OpenAI/Anthropic-format compatible; configure base URL and key."];
    };
    readonly qwen: {
        readonly credentialType: "Model Studio API key";
        readonly apiKeyManagementUrl: "https://bailian.console.aliyun.com/?tab=api#/api-key";
        readonly configurationDocsUrl: "https://www.alibabacloud.com/help/en/model-studio/get-api-key";
        readonly authMethod: "API key; OpenAI-compatible or DashScope SDK depending on endpoint";
        readonly recommendedEnvVars: readonly ["DASHSCOPE_API_KEY", "ALIBABA_CLOUD_API_KEY"];
        readonly baseUrls: readonly ["https://dashscope-intl.aliyuncs.com/compatible-mode/v1", "https://dashscope.aliyuncs.com/compatible-mode/v1"];
        readonly importantNotes: readonly ["Alibaba recommends using environment variables and not hard-coding the key.", "Regional endpoint/account selection matters."];
    };
    readonly kimi: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://platform.moonshot.ai/console/api-keys";
        readonly configurationDocsUrl: "https://platform.moonshot.ai/";
        readonly authMethod: "API key / OpenAI-compatible Bearer token";
        readonly recommendedEnvVars: readonly ["MOONSHOT_API_KEY", "KIMI_API_KEY"];
        readonly baseUrls: readonly ["https://api.moonshot.ai/v1"];
        readonly importantNotes: readonly ["Official platform is the source for key generation; public docs are less indexable than some providers."];
    };
    readonly zai: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://open.bigmodel.cn/usercenter/apikeys";
        readonly configurationDocsUrl: "https://open.bigmodel.cn/dev/api";
        readonly authMethod: "API key / Bearer token depending on SDK/API";
        readonly recommendedEnvVars: readonly ["ZHIPUAI_API_KEY", "ZAI_API_KEY"];
        readonly baseUrls: readonly ["https://open.bigmodel.cn/api/paas/v4"];
        readonly importantNotes: readonly ["Zhipu/BigModel is the mainland China platform; Z.ai branding may use related GLM endpoints."];
    };
    readonly minimax: {
        readonly credentialType: "API key; Token Plan key is separate";
        readonly apiKeyManagementUrl: "https://platform.minimax.io/user-center/basic-information/interface-key";
        readonly configurationDocsUrl: "https://platform.minimax.io/docs/api-reference/api-overview";
        readonly authMethod: "API key / Bearer token";
        readonly recommendedEnvVars: readonly ["MINIMAX_API_KEY"];
        readonly baseUrls: readonly ["https://api.minimax.io", "https://api.minimaxi.com"];
        readonly importantNotes: readonly ["Pay-as-you-go API keys and Token Plan keys are different; API host and key region must match."];
    };
    readonly elevenlabs: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://elevenlabs.io/app/settings/api-keys";
        readonly configurationDocsUrl: "https://elevenlabs.io/docs/api-reference/authentication";
        readonly authMethod: "xi-api-key header";
        readonly recommendedEnvVars: readonly ["ELEVENLABS_API_KEY"];
        readonly baseUrls: readonly ["https://api.elevenlabs.io"];
        readonly importantNotes: readonly ["Each request must include the API key; keys can be restricted/scoped."];
    };
    readonly deepgram: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://console.deepgram.com/project/keys";
        readonly configurationDocsUrl: "https://developers.deepgram.com/docs/create-additional-api-keys";
        readonly authMethod: "Token/API key auth";
        readonly recommendedEnvVars: readonly ["DEEPGRAM_API_KEY"];
        readonly baseUrls: readonly ["https://api.deepgram.com"];
        readonly importantNotes: readonly ["Keys are project-scoped; Deepgram supports short-lived token auth for client-side use cases."];
    };
    readonly cartesia: {
        readonly credentialType: "API key; admin API keys for key-management endpoints";
        readonly apiKeyManagementUrl: "https://play.cartesia.ai/keys";
        readonly configurationDocsUrl: "https://docs.cartesia.ai/use-the-api/api-conventions";
        readonly authMethod: "Authorization: Bearer <api_key> plus Cartesia-Version header";
        readonly recommendedEnvVars: readonly ["CARTESIA_API_KEY"];
        readonly baseUrls: readonly ["https://api.cartesia.ai"];
        readonly importantNotes: readonly ["Use server-side API keys for backend requests; use Cartesia access tokens for client-side authentication patterns."];
    };
    readonly 'black-forest-labs': {
        readonly credentialType: "BFL API key";
        readonly apiKeyManagementUrl: "https://api.us1.bfl.ai/auth/profile";
        readonly configurationDocsUrl: "https://docs.bfl.ai/";
        readonly authMethod: "API key authentication";
        readonly recommendedEnvVars: readonly ["BFL_API_KEY"];
        readonly baseUrls: readonly ["https://api.us1.bfl.ai"];
        readonly importantNotes: readonly ["Official API docs are linked from the BFL site/GitHub; key management may require account login."];
    };
    readonly midjourney: {
        readonly credentialType: "No generally available official API key found";
        readonly apiKeyManagementUrl: null;
        readonly configurationDocsUrl: "https://docs.midjourney.com/hc/en-us";
        readonly authMethod: null;
        readonly recommendedEnvVars: readonly [];
        readonly baseUrls: readonly [];
        readonly importantNotes: readonly ["Midjourney has official product/user docs but no generally available official public API-key configuration page found."];
    };
    readonly kling: {
        readonly credentialType: "Access key and secret key";
        readonly apiKeyManagementUrl: "https://app.klingai.com/global/dev/account/apiKey";
        readonly configurationDocsUrl: "https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview";
        readonly authMethod: "Kling developer API authentication using access/secret credentials";
        readonly recommendedEnvVars: readonly ["KLING_ACCESS_KEY", "KLING_SECRET_KEY"];
        readonly baseUrls: readonly [];
        readonly importantNotes: readonly ["Official developer docs exist under Kling AI; credential flow may expose both access key and secret key."];
    };
    readonly runway: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://dev.runwayml.com/";
        readonly configurationDocsUrl: "https://docs.dev.runwayml.com/guides/setup/";
        readonly authMethod: "API key authentication";
        readonly recommendedEnvVars: readonly ["RUNWAYML_API_SECRET", "RUNWAY_API_KEY"];
        readonly baseUrls: readonly ["https://api.dev.runwayml.com"];
        readonly importantNotes: readonly ["Create an organization, add credits, then create/use the API key in the developer portal."];
    };
    readonly luma: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://lumalabs.ai/dream-machine/api/keys";
        readonly configurationDocsUrl: "https://docs.lumalabs.ai/docs/welcome";
        readonly authMethod: "API key authentication";
        readonly recommendedEnvVars: readonly ["LUMA_API_KEY"];
        readonly baseUrls: readonly ["https://api.lumalabs.ai/dream-machine/v1"];
        readonly importantNotes: readonly ["Dream Machine API keys and billing are managed in Luma's API dashboard."];
    };
    readonly 'stability-ai': {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://platform.stability.ai/account/keys";
        readonly configurationDocsUrl: "https://platform.stability.ai/docs/getting-started";
        readonly authMethod: "Authorization: Bearer <api_key>";
        readonly recommendedEnvVars: readonly ["STABILITY_API_KEY"];
        readonly baseUrls: readonly ["https://api.stability.ai"];
        readonly importantNotes: readonly ["Keep keys secret; create a new key and delete old one if leaked."];
    };
    readonly ideogram: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://ideogram.ai/manage-api";
        readonly configurationDocsUrl: "https://developer.ideogram.ai/ideogram-api/api-setup";
        readonly authMethod: "API key authentication";
        readonly recommendedEnvVars: readonly ["IDEOGRAM_API_KEY"];
        readonly baseUrls: readonly ["https://api.ideogram.ai"];
        readonly importantNotes: readonly ["Create API keys from Manage API; keys are displayed only partially after creation."];
    };
    readonly pika: {
        readonly credentialType: "Fal API key for official Pika API access via Fal; third-party Pika keys also exist";
        readonly apiKeyManagementUrl: "https://fal.ai/dashboard/keys";
        readonly configurationDocsUrl: "https://pika.art/api";
        readonly authMethod: "FAL_KEY / API key authentication";
        readonly recommendedEnvVars: readonly ["FAL_KEY", "PIKA_API_KEY"];
        readonly baseUrls: readonly ["https://fal.run"];
        readonly importantNotes: readonly ["Pika's official API page points developers to Fal.ai for API access; avoid confusing this with unrelated third-party Pika API services."];
    };
    readonly suno: {
        readonly credentialType: "No generally available official Suno API key found";
        readonly apiKeyManagementUrl: null;
        readonly configurationDocsUrl: null;
        readonly authMethod: null;
        readonly recommendedEnvVars: readonly [];
        readonly baseUrls: readonly [];
        readonly importantNotes: readonly ["No clearly official, generally available Suno API-key configuration page found; public 'Suno API' sites appear third-party/unofficial and should be validated before use."];
    };
    readonly reka: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://platform.reka.ai/";
        readonly configurationDocsUrl: "https://docs.reka.ai/quickstart";
        readonly authMethod: "API key authentication";
        readonly recommendedEnvVars: readonly ["REKA_API_KEY"];
        readonly baseUrls: readonly ["https://api.reka.ai"];
        readonly importantNotes: readonly ["Reka docs instruct users to obtain an API key by setting up an account in the Reka Platform."];
    };
    readonly perplexity: {
        readonly credentialType: "API key";
        readonly apiKeyManagementUrl: "https://www.perplexity.ai/settings/api";
        readonly configurationDocsUrl: "https://docs.perplexity.ai/docs/admin/api-key-management";
        readonly authMethod: "Bearer token";
        readonly recommendedEnvVars: readonly ["PPLX_API_KEY", "PERPLEXITY_API_KEY"];
        readonly baseUrls: readonly ["https://api.perplexity.ai"];
        readonly importantNotes: readonly ["API keys are shown only once; save immediately. Docs cover create/manage/rotate operations."];
    };
};
export declare const DEFAULT_PROVIDERS: readonly Provider[];
export declare function getProviderApiConfigurationUrl(provider: Pick<Provider, 'apiConfiguration' | 'baseUrl'>): string;
export declare function providerHasCapability(provider: Pick<Provider, 'capabilities'>, capability: string): boolean;
export declare function providerHasImageCapability(provider: Pick<Provider, 'capabilities'>): boolean;
export declare function hasDefaultProviderCapability(providerId: string, capability: string): boolean;
