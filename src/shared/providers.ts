import type { Model } from './service';

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

export const PROVIDER_API_CONFIGURATIONS = {
	openai: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://platform.openai.com/api-keys',
		configurationDocsUrl: 'https://developers.openai.com/api/docs/quickstart',
		authMethod: 'HTTP Bearer token',
		recommendedEnvVars: ['OPENAI_API_KEY'],
		baseUrls: ['https://api.openai.com/v1'],
		importantNotes: [
			'Create/export the key before calling the API.',
			'Keep server-side; do not expose in browser or client apps.',
		],
	},
	anthropic: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://console.anthropic.com/settings/keys',
		configurationDocsUrl: 'https://platform.claude.com/docs/en/api/overview',
		authMethod: 'x-api-key header plus anthropic-version header',
		recommendedEnvVars: ['ANTHROPIC_API_KEY'],
		baseUrls: ['https://api.anthropic.com'],
		importantNotes: [
			'Official SDKs handle the required headers automatically.',
			'Keys are generated in the Anthropic Console.',
		],
	},
	google: {
		credentialType: 'Gemini API key / Google Cloud credentials depending on service',
		apiKeyManagementUrl: 'https://aistudio.google.com/app/apikey',
		configurationDocsUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
		authMethod:
			'API key parameter/header for Gemini Developer API; Google Cloud IAM/auth for Vertex/Cloud APIs',
		recommendedEnvVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
		baseUrls: ['https://generativelanguage.googleapis.com'],
		importantNotes: [
			'Use Google AI Studio for Gemini API keys.',
			'For Vertex AI or Cloud Speech/Text-to-Speech, prefer Google Cloud project credentials and IAM.',
		],
	},
	meta: {
		credentialType: 'Llama API key',
		apiKeyManagementUrl: 'https://llama.developer.meta.com/',
		configurationDocsUrl: 'https://llama.developer.meta.com/docs/api-keys/',
		authMethod: 'API key authentication',
		recommendedEnvVars: ['LLAMA_API_KEY'],
		baseUrls: [],
		importantNotes: [
			'Meta Llama API has its own API-key dashboard; availability may depend on preview/rollout access.',
		],
	},
	xai: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://console.x.ai/',
		configurationDocsUrl: 'https://docs.x.ai/developers/quickstart',
		authMethod: 'HTTP Bearer token',
		recommendedEnvVars: ['XAI_API_KEY'],
		baseUrls: ['https://api.x.ai/v1'],
		importantNotes: ['Generate key in the xAI console/API Keys page, then export XAI_API_KEY.'],
	},
	mistral: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://admin.mistral.ai/organization/api-keys',
		configurationDocsUrl: 'https://docs.mistral.ai/getting-started/quickstarts',
		authMethod: 'HTTP Bearer token',
		recommendedEnvVars: ['MISTRAL_API_KEY'],
		baseUrls: ['https://api.mistral.ai/v1'],
		importantNotes: [
			'Create keys in La Plateforme/admin console; use the same key across Mistral API calls subject to account permissions.',
		],
	},
	cohere: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://dashboard.cohere.com/api-keys',
		configurationDocsUrl: 'https://docs.cohere.com/reference/about',
		authMethod: 'Bearer/API key auth via official SDKs',
		recommendedEnvVars: ['COHERE_API_KEY'],
		baseUrls: ['https://api.cohere.com'],
		importantNotes: ['Cohere distinguishes evaluation/trial keys and production keys.'],
	},
	deepseek: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://platform.deepseek.com/api_keys',
		configurationDocsUrl: 'https://api-docs.deepseek.com/',
		authMethod: 'OpenAI-compatible Bearer token',
		recommendedEnvVars: ['DEEPSEEK_API_KEY'],
		baseUrls: ['https://api.deepseek.com'],
		importantNotes: [
			'DeepSeek API is OpenAI/Anthropic-format compatible; configure base URL and key.',
		],
	},
	qwen: {
		credentialType: 'Model Studio API key',
		apiKeyManagementUrl: 'https://bailian.console.aliyun.com/?tab=api#/api-key',
		configurationDocsUrl: 'https://www.alibabacloud.com/help/en/model-studio/get-api-key',
		authMethod: 'API key; OpenAI-compatible or DashScope SDK depending on endpoint',
		recommendedEnvVars: ['DASHSCOPE_API_KEY', 'ALIBABA_CLOUD_API_KEY'],
		baseUrls: [
			'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
			'https://dashscope.aliyuncs.com/compatible-mode/v1',
		],
		importantNotes: [
			'Alibaba recommends using environment variables and not hard-coding the key.',
			'Regional endpoint/account selection matters.',
		],
	},
	kimi: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://platform.moonshot.ai/console/api-keys',
		configurationDocsUrl: 'https://platform.moonshot.ai/',
		authMethod: 'API key / OpenAI-compatible Bearer token',
		recommendedEnvVars: ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
		baseUrls: ['https://api.moonshot.ai/v1'],
		importantNotes: [
			'Official platform is the source for key generation; public docs are less indexable than some providers.',
		],
	},
	zai: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
		configurationDocsUrl: 'https://open.bigmodel.cn/dev/api',
		authMethod: 'API key / Bearer token depending on SDK/API',
		recommendedEnvVars: ['ZHIPUAI_API_KEY', 'ZAI_API_KEY'],
		baseUrls: ['https://open.bigmodel.cn/api/paas/v4'],
		importantNotes: [
			'Zhipu/BigModel is the mainland China platform; Z.ai branding may use related GLM endpoints.',
		],
	},
	baidu: {
		credentialType: 'Qianfan API key / access token credentials',
		apiKeyManagementUrl:
			'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
		configurationDocsUrl: 'https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb',
		authMethod: 'Qianfan API key or access-token flow depending on API generation',
		recommendedEnvVars: [
			'QIANFAN_API_KEY',
			'QIANFAN_SECRET_KEY',
			'QIANFAN_ACCESS_KEY',
			'QIANFAN_SECRET_ACCESS_KEY',
		],
		baseUrls: ['https://qianfan.baidubce.com/v2'],
		importantNotes: [
			'Baidu Qianfan credentials can involve API key/secret or access-token management depending on SDK/API path.',
		],
	},
	'tencent-hunyuan': {
		credentialType: 'Tencent Cloud SecretId/SecretKey or Hunyuan API key',
		apiKeyManagementUrl: 'https://console.cloud.tencent.com/cam/capi',
		configurationDocsUrl: 'https://intl.cloud.tencent.com/ind/document/product/1290/79463',
		authMethod: 'Tencent Cloud API 3.0 signature or Hunyuan API key depending on endpoint',
		recommendedEnvVars: ['TENCENTCLOUD_SECRET_ID', 'TENCENTCLOUD_SECRET_KEY', 'HUNYUAN_API_KEY'],
		baseUrls: [],
		importantNotes: [
			'Tencent Cloud services often use SecretId/SecretKey signing rather than a single API key; Hunyuan console also exposes API-key pages for some products/regions.',
		],
	},
	'bytedance-seed': {
		credentialType: 'BytePlus ModelArk API key',
		apiKeyManagementUrl: 'https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey',
		configurationDocsUrl: 'https://docs.byteplus.com/en/docs/ModelArk/1399008',
		authMethod: 'API key / Bearer token',
		recommendedEnvVars: ['ARK_API_KEY', 'BYTEPLUS_API_KEY'],
		baseUrls: ['https://ark.ap-southeast.bytepluses.com/api/v3'],
		importantNotes: [
			'Obtain and configure an API key, then enable the relevant ModelArk model service.',
		],
	},
	minimax: {
		credentialType: 'API key; Token Plan key is separate',
		apiKeyManagementUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key',
		configurationDocsUrl: 'https://platform.minimax.io/docs/api-reference/api-overview',
		authMethod: 'API key / Bearer token',
		recommendedEnvVars: ['MINIMAX_API_KEY'],
		baseUrls: ['https://api.minimax.io', 'https://api.minimaxi.com'],
		importantNotes: [
			'Pay-as-you-go API keys and Token Plan keys are different; API host and key region must match.',
		],
	},
	elevenlabs: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://elevenlabs.io/app/settings/api-keys',
		configurationDocsUrl: 'https://elevenlabs.io/docs/api-reference/authentication',
		authMethod: 'xi-api-key header',
		recommendedEnvVars: ['ELEVENLABS_API_KEY'],
		baseUrls: ['https://api.elevenlabs.io'],
		importantNotes: ['Each request must include the API key; keys can be restricted/scoped.'],
	},
	deepgram: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://console.deepgram.com/project/keys',
		configurationDocsUrl: 'https://developers.deepgram.com/docs/create-additional-api-keys',
		authMethod: 'Token/API key auth',
		recommendedEnvVars: ['DEEPGRAM_API_KEY'],
		baseUrls: ['https://api.deepgram.com'],
		importantNotes: [
			'Keys are project-scoped; Deepgram supports short-lived token auth for client-side use cases.',
		],
	},
	cartesia: {
		credentialType: 'API key; admin API keys for key-management endpoints',
		apiKeyManagementUrl: 'https://play.cartesia.ai/keys',
		configurationDocsUrl: 'https://docs.cartesia.ai/use-the-api/api-conventions',
		authMethod: 'Authorization: Bearer <api_key> plus Cartesia-Version header',
		recommendedEnvVars: ['CARTESIA_API_KEY'],
		baseUrls: ['https://api.cartesia.ai'],
		importantNotes: [
			'Use server-side API keys for backend requests; use Cartesia access tokens for client-side authentication patterns.',
		],
	},
	'black-forest-labs': {
		credentialType: 'BFL API key',
		apiKeyManagementUrl: 'https://api.us1.bfl.ai/auth/profile',
		configurationDocsUrl: 'https://docs.bfl.ai/',
		authMethod: 'API key authentication',
		recommendedEnvVars: ['BFL_API_KEY'],
		baseUrls: ['https://api.us1.bfl.ai'],
		importantNotes: [
			'Official API docs are linked from the BFL site/GitHub; key management may require account login.',
		],
	},
	midjourney: {
		credentialType: 'No generally available official API key found',
		apiKeyManagementUrl: null,
		configurationDocsUrl: 'https://docs.midjourney.com/hc/en-us',
		authMethod: null,
		recommendedEnvVars: [],
		baseUrls: [],
		importantNotes: [
			'Midjourney has official product/user docs but no generally available official public API-key configuration page found.',
		],
	},
	'adobe-firefly': {
		credentialType: 'Adobe Developer API key/client credentials plus access token',
		apiKeyManagementUrl: 'https://developer.adobe.com/console',
		configurationDocsUrl: 'https://developer.adobe.com/firefly-services/docs/guides/get-started',
		authMethod: 'Adobe API key + OAuth access token',
		recommendedEnvVars: [
			'FIREFLY_SERVICES_CLIENT_ID',
			'FIREFLY_SERVICES_CLIENT_SECRET',
			'FIREFLY_SERVICES_ACCESS_TOKEN',
		],
		baseUrls: ['https://firefly-api.adobe.io'],
		importantNotes: [
			'Firefly Services require Adobe Developer Console credentials and an access token; not just a static API key.',
		],
	},
	kling: {
		credentialType: 'Access key and secret key',
		apiKeyManagementUrl: 'https://app.klingai.com/global/dev/account/apiKey',
		configurationDocsUrl:
			'https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview',
		authMethod: 'Kling developer API authentication using access/secret credentials',
		recommendedEnvVars: ['KLING_ACCESS_KEY', 'KLING_SECRET_KEY'],
		baseUrls: [],
		importantNotes: [
			'Official developer docs exist under Kling AI; credential flow may expose both access key and secret key.',
		],
	},
	runway: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://dev.runwayml.com/',
		configurationDocsUrl: 'https://docs.dev.runwayml.com/guides/setup/',
		authMethod: 'API key authentication',
		recommendedEnvVars: ['RUNWAYML_API_SECRET', 'RUNWAY_API_KEY'],
		baseUrls: ['https://api.dev.runwayml.com'],
		importantNotes: [
			'Create an organization, add credits, then create/use the API key in the developer portal.',
		],
	},
	luma: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://lumalabs.ai/dream-machine/api/keys',
		configurationDocsUrl: 'https://docs.lumalabs.ai/docs/welcome',
		authMethod: 'API key authentication',
		recommendedEnvVars: ['LUMA_API_KEY'],
		baseUrls: ['https://api.lumalabs.ai/dream-machine/v1'],
		importantNotes: ["Dream Machine API keys and billing are managed in Luma's API dashboard."],
	},
	'stability-ai': {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://platform.stability.ai/account/keys',
		configurationDocsUrl: 'https://platform.stability.ai/docs/getting-started',
		authMethod: 'Authorization: Bearer <api_key>',
		recommendedEnvVars: ['STABILITY_API_KEY'],
		baseUrls: ['https://api.stability.ai'],
		importantNotes: ['Keep keys secret; create a new key and delete old one if leaked.'],
	},
	ideogram: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://ideogram.ai/manage-api',
		configurationDocsUrl: 'https://developer.ideogram.ai/ideogram-api/api-setup',
		authMethod: 'API key authentication',
		recommendedEnvVars: ['IDEOGRAM_API_KEY'],
		baseUrls: ['https://api.ideogram.ai'],
		importantNotes: [
			'Create API keys from Manage API; keys are displayed only partially after creation.',
		],
	},
	pika: {
		credentialType:
			'Fal API key for official Pika API access via Fal; third-party Pika keys also exist',
		apiKeyManagementUrl: 'https://fal.ai/dashboard/keys',
		configurationDocsUrl: 'https://pika.art/api',
		authMethod: 'FAL_KEY / API key authentication',
		recommendedEnvVars: ['FAL_KEY', 'PIKA_API_KEY'],
		baseUrls: ['https://fal.run'],
		importantNotes: [
			"Pika's official API page points developers to Fal.ai for API access; avoid confusing this with unrelated third-party Pika API services.",
		],
	},
	suno: {
		credentialType: 'No generally available official Suno API key found',
		apiKeyManagementUrl: null,
		configurationDocsUrl: null,
		authMethod: null,
		recommendedEnvVars: [],
		baseUrls: [],
		importantNotes: [
			"No clearly official, generally available Suno API-key configuration page found; public 'Suno API' sites appear third-party/unofficial and should be validated before use.",
		],
	},
	reka: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://platform.reka.ai/',
		configurationDocsUrl: 'https://docs.reka.ai/quickstart',
		authMethod: 'API key authentication',
		recommendedEnvVars: ['REKA_API_KEY'],
		baseUrls: ['https://api.reka.ai'],
		importantNotes: [
			'Reka docs instruct users to obtain an API key by setting up an account in the Reka Platform.',
		],
	},
	ai21: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://studio.ai21.com/account/api-keys',
		configurationDocsUrl: 'https://docs.ai21.com/docs/create-api-key',
		authMethod: 'API key authentication',
		recommendedEnvVars: ['AI21_API_KEY'],
		baseUrls: ['https://api.ai21.com/studio/v1'],
		importantNotes: ['Create keys in AI21 Studio settings; save/copy the key securely.'],
	},
	perplexity: {
		credentialType: 'API key',
		apiKeyManagementUrl: 'https://www.perplexity.ai/settings/api',
		configurationDocsUrl: 'https://docs.perplexity.ai/docs/admin/api-key-management',
		authMethod: 'Bearer token',
		recommendedEnvVars: ['PPLX_API_KEY', 'PERPLEXITY_API_KEY'],
		baseUrls: ['https://api.perplexity.ai'],
		importantNotes: [
			'API keys are shown only once; save immediately. Docs cover create/manage/rotate operations.',
		],
	},
	nvidia: {
		credentialType: 'NVIDIA API key / NGC API key depending on service',
		apiKeyManagementUrl: 'https://build.nvidia.com/settings/api-keys',
		configurationDocsUrl:
			'https://docs.nvidia.com/nim/large-language-models/latest/getting-started.html',
		authMethod: 'Bearer token for hosted NVIDIA NIM endpoints; NGC key for NGC services',
		recommendedEnvVars: ['NVIDIA_API_KEY', 'NGC_API_KEY'],
		baseUrls: ['https://integrate.api.nvidia.com/v1'],
		importantNotes: [
			'NVIDIA hosted NIM endpoints require a cloud API key; self-hosted NIM deployments may not require the same hosted key.',
		],
	},
} as const satisfies Readonly<Record<string, ProviderApiConfiguration>>;

export const DEFAULT_PROVIDERS: readonly Provider[] = [
	{
		id: 'openai',
		name: 'OpenAI',
		baseUrl: 'https://api.openai.com/v1',
		apiKey: '',
		capabilities: 'Chat - Speech-to-text - Text-to-speech - Image - Video',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.openai,
	},
	{
		id: 'anthropic',
		name: 'Anthropic',
		baseUrl: 'https://api.anthropic.com',
		apiKey: '',
		capabilities: 'Chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.anthropic,
	},
	{
		id: 'google',
		name: 'Google DeepMind / Google',
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
		apiKey: '',
		capabilities: 'Chat - Speech-to-text - Text-to-speech - Image - Video - Music',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.google,
	},
	{
		id: 'meta',
		name: 'Meta',
		baseUrl: 'https://ai.meta.com',
		apiKey: '',
		capabilities: 'Chat - Video',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.meta,
	},
	{
		id: 'xai',
		name: 'xAI',
		baseUrl: 'https://api.x.ai/v1',
		apiKey: '',
		capabilities: 'Chat - Realtime voice - Image - Video',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.xai,
	},
	{
		id: 'mistral',
		name: 'Mistral AI',
		baseUrl: 'https://api.mistral.ai/v1',
		apiKey: '',
		capabilities: 'Chat - Speech-to-text - Text-to-speech',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.mistral,
	},
	{
		id: 'cohere',
		name: 'Cohere',
		baseUrl: 'https://api.cohere.com',
		apiKey: '',
		capabilities: 'Chat - Speech-to-text',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.cohere,
	},
	{
		id: 'deepseek',
		name: 'DeepSeek',
		baseUrl: 'https://api.deepseek.com',
		apiKey: '',
		capabilities: 'Chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.deepseek,
	},
	{
		id: 'qwen',
		name: 'Alibaba / Qwen / Wan',
		baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
		apiKey: '',
		capabilities: 'Chat - Omni - Image - Video',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.qwen,
	},
	{
		id: 'kimi',
		name: 'Moonshot AI / Kimi',
		baseUrl: 'https://api.moonshot.ai/v1',
		apiKey: '',
		capabilities: 'Chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.kimi,
	},
	{
		id: 'zai',
		name: 'Z.ai / Zhipu AI',
		baseUrl: 'https://api.z.ai/api/paas/v4',
		apiKey: '',
		capabilities: 'Chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.zai,
	},
	{
		id: 'baidu',
		name: 'Baidu',
		baseUrl: 'https://qianfan.baidubce.com/v2',
		apiKey: '',
		capabilities: 'Chat - Omni - Image',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.baidu,
	},
	{
		id: 'tencent-hunyuan',
		name: 'Tencent Hunyuan',
		baseUrl: 'https://hunyuan.tencent.com',
		apiKey: '',
		capabilities: 'Chat - Image - Video - 3D',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS['tencent-hunyuan'],
	},
	{
		id: 'bytedance-seed',
		name: 'ByteDance Seed',
		baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
		apiKey: '',
		capabilities: 'Chat - Image - Video - 3D',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS['bytedance-seed'],
	},
	{
		id: 'minimax',
		name: 'MiniMax',
		baseUrl: 'https://api.minimax.io/v1',
		apiKey: '',
		capabilities: 'Chat - Text-to-speech - Video - Music',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.minimax,
	},
	{
		id: 'elevenlabs',
		name: 'ElevenLabs',
		baseUrl: 'https://api.elevenlabs.io/v1',
		apiKey: '',
		capabilities: 'Speech-to-text - Text-to-speech - Audio - Music',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.elevenlabs,
	},
	{
		id: 'deepgram',
		name: 'Deepgram',
		baseUrl: 'https://api.deepgram.com/v1',
		apiKey: '',
		capabilities: 'Speech-to-text - Text-to-speech',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.deepgram,
	},
	{
		id: 'cartesia',
		name: 'Cartesia',
		baseUrl: 'https://api.cartesia.ai',
		apiKey: '',
		capabilities: 'Text-to-speech',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.cartesia,
	},
	{
		id: 'black-forest-labs',
		name: 'Black Forest Labs',
		baseUrl: 'https://api.bfl.ai/v1',
		apiKey: '',
		capabilities: 'Image',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS['black-forest-labs'],
	},
	{
		id: 'midjourney',
		name: 'Midjourney',
		baseUrl: 'https://www.midjourney.com',
		apiKey: '',
		capabilities: 'Image - Video',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.midjourney,
	},
	{
		id: 'adobe-firefly',
		name: 'Adobe Firefly',
		baseUrl: 'https://firefly-api.adobe.io',
		apiKey: '',
		capabilities: 'Image - Video - Audio',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS['adobe-firefly'],
	},
	{
		id: 'kling',
		name: 'Kuaishou / Kling AI',
		baseUrl: 'https://kling.ai',
		apiKey: '',
		capabilities: 'Image - Video - Audio',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.kling,
	},
	{
		id: 'runway',
		name: 'Runway',
		baseUrl: 'https://api.dev.runwayml.com/v1',
		apiKey: '',
		capabilities: 'Video',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.runway,
	},
	{
		id: 'luma',
		name: 'Luma AI',
		baseUrl: 'https://api.lumalabs.ai/dream-machine/v1',
		apiKey: '',
		capabilities: 'Omni - Image - Video - 3D',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.luma,
	},
	{
		id: 'stability-ai',
		name: 'Stability AI',
		baseUrl: 'https://api.stability.ai/v2beta',
		apiKey: '',
		capabilities: 'Image - Video - Audio',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS['stability-ai'],
	},
	{
		id: 'ideogram',
		name: 'Ideogram',
		baseUrl: 'https://api.ideogram.ai',
		apiKey: '',
		capabilities: 'Image',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.ideogram,
	},
	{
		id: 'pika',
		name: 'Pika',
		baseUrl: 'https://pika.art',
		apiKey: '',
		capabilities: 'Video',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.pika,
	},
	{
		id: 'suno',
		name: 'Suno',
		baseUrl: 'https://suno.com',
		apiKey: '',
		capabilities: 'Music',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.suno,
	},
	{
		id: 'reka',
		name: 'Reka AI',
		baseUrl: 'https://api.reka.ai/v1',
		apiKey: '',
		capabilities: 'Chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.reka,
	},
	{
		id: 'ai21',
		name: 'AI21 Labs',
		baseUrl: 'https://api.ai21.com/studio/v1',
		apiKey: '',
		capabilities: 'Chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.ai21,
	},
	{
		id: 'perplexity',
		name: 'Perplexity',
		baseUrl: 'https://api.perplexity.ai',
		apiKey: '',
		capabilities: 'Research chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.perplexity,
	},
	{
		id: 'nvidia',
		name: 'NVIDIA',
		baseUrl: 'https://integrate.api.nvidia.com/v1',
		apiKey: '',
		capabilities: 'Chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.nvidia,
	},
];

export const DEFAULT_AGENT_MODELS_BY_PROVIDER: Readonly<Record<string, readonly Model[]>> = {
	openai: [
		{ id: 'gpt-5.5', name: 'GPT-5.5' },
		{ id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro' },
		{ id: 'gpt-5.4', name: 'GPT-5.4' },
		{ id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro' },
		{ id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
	],
	anthropic: [
		{ id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
		{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
		{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
		{ id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
	],
	google: [
		{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
		{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
		{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
		{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
		{ id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
	],
	meta: [
		{ id: 'llama-4-maverick', name: 'Llama 4 Maverick' },
		{ id: 'llama-4-scout', name: 'Llama 4 Scout' },
		{ id: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
	],
	xai: [
		{ id: 'grok-4.3', name: 'Grok 4.3' },
		{ id: 'grok-4.3-fast', name: 'Grok 4.3 Fast' },
		{ id: 'grok-code-fast', name: 'Grok Code Fast' },
	],
	mistral: [
		{ id: 'mistral-large-2512', name: 'Mistral Large 3' },
		{ id: 'mistral-large-latest', name: 'Mistral Large Latest' },
		{ id: 'mistral-medium-2604', name: 'Mistral Medium 3.5' },
		{ id: 'mistral-medium-latest', name: 'Mistral Medium Latest' },
		{ id: 'mistral-medium-2508', name: 'Mistral Medium 3.1' },
		{ id: 'mistral-small-2603', name: 'Mistral Small 4' },
		{ id: 'mistral-small-latest', name: 'Mistral Small Latest' },
		{ id: 'ministral-14b-2512', name: 'Ministral 3 14B' },
		{ id: 'ministral-14b-latest', name: 'Ministral 3 14B Latest' },
		{ id: 'ministral-8b-2512', name: 'Ministral 3 8B' },
		{ id: 'ministral-8b-latest', name: 'Ministral 3 8B Latest' },
		{ id: 'ministral-3b-2512', name: 'Ministral 3 3B' },
		{ id: 'ministral-3b-latest', name: 'Ministral 3 3B Latest' },
		{ id: 'magistral-medium-2509', name: 'Magistral Medium 1.2' },
		{ id: 'magistral-medium-latest', name: 'Magistral Medium Latest' },
	],
	cohere: [
		{ id: 'command-a-03-2025', name: 'Command A' },
		{ id: 'command-a-reasoning-08-2025', name: 'Command A Reasoning' },
		{ id: 'command-a-vision-07-2025', name: 'Command A Vision' },
		{ id: 'aya-vision', name: 'Aya Vision' },
	],
	deepseek: [
		{ id: 'deepseek-v4-pro', name: 'DeepSeek V4-Pro' },
		{ id: 'deepseek-v4-flash', name: 'DeepSeek V4-Flash' },
	],
	qwen: [
		{ id: 'qwen3-max', name: 'Qwen3-Max' },
		{ id: 'qwen3.5-plus', name: 'Qwen3.5-Plus' },
		{ id: 'qwen3.5-flash', name: 'Qwen3.5-Flash' },
		{ id: 'qwen3-coder-plus', name: 'Qwen3-Coder-Plus' },
		{ id: 'qwq-plus', name: 'QwQ-Plus' },
	],
	kimi: [
		{ id: 'kimi-k2.6', name: 'Kimi K2.6' },
		{ id: 'kimi-k2.5', name: 'Kimi K2.5' },
		{ id: 'kimi-k2', name: 'Kimi K2' },
		{ id: 'kimi-latest', name: 'Kimi Latest' },
	],
	zai: [
		{ id: 'glm-5.1', name: 'GLM-5.1' },
		{ id: 'glm-5', name: 'GLM-5' },
		{ id: 'glm-4.6', name: 'GLM-4.6' },
		{ id: 'glm-4.5v', name: 'GLM-4.5V' },
		{ id: 'glm-z1', name: 'GLM-Z1' },
	],
	baidu: [
		{ id: 'ernie-5.1', name: 'ERNIE 5.1' },
		{ id: 'ernie-5.0', name: 'ERNIE 5.0' },
		{ id: 'ernie-x1.1', name: 'ERNIE X1.1' },
		{ id: 'ernie-4.5', name: 'ERNIE 4.5' },
	],
	'tencent-hunyuan': [{ id: 'hy3-preview', name: 'Hy3 Preview' }],
	'bytedance-seed': [
		{ id: 'seed2.0-pro', name: 'Seed2.0 Pro' },
		{ id: 'seed2.0-code', name: 'Seed2.0 Code' },
	],
	minimax: [{ id: 'minimax-m2.7', name: 'MiniMax M2.7' }],
	luma: [{ id: 'uni-1', name: 'Uni-1' }],
	reka: [
		{ id: 'reka-core', name: 'Reka Core' },
		{ id: 'reka-flash', name: 'Reka Flash' },
		{ id: 'reka-edge', name: 'Reka Edge' },
	],
	ai21: [
		{ id: 'jamba-large', name: 'Jamba Large' },
		{ id: 'jamba-mini', name: 'Jamba Mini' },
		{ id: 'jamba-1.5-large', name: 'Jamba 1.5 Large' },
		{ id: 'jamba-1.5-mini', name: 'Jamba 1.5 Mini' },
	],
	perplexity: [
		{ id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro' },
		{ id: 'sonar-pro', name: 'Sonar Pro' },
		{ id: 'sonar-deep-research', name: 'Sonar Deep Research' },
		{ id: 'r1-1776', name: 'R1 1776' },
	],
	nvidia: [
		{ id: 'nemotron-ultra-latest', name: 'Nemotron Ultra / latest' },
		{ id: 'llama-nemotron-super', name: 'Llama Nemotron Super' },
		{ id: 'llama-nemotron-nano', name: 'Llama Nemotron Nano' },
		{ id: 'nemotron-vl', name: 'Nemotron VL' },
	],
} as const;

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export function getProviderApiConfigurationUrl(
	provider: Pick<Provider, 'apiConfiguration' | 'baseUrl'>
): string {
	return (
		provider.apiConfiguration?.apiKeyManagementUrl?.trim() ||
		provider.apiConfiguration?.configurationDocsUrl?.trim() ||
		provider.baseUrl.trim()
	);
}

function providerCapabilityTokens(provider: Pick<Provider, 'capabilities'>): string[] {
	return (provider.capabilities ?? '')
		.split(/\s+-\s+/)
		.map((capability) => capability.trim().toLowerCase())
		.filter(Boolean);
}

export function providerHasCapability(
	provider: Pick<Provider, 'capabilities'>,
	capability: string
): boolean {
	return providerCapabilityTokens(provider).includes(capability.trim().toLowerCase());
}

export function providerHasImageCapability(provider: Pick<Provider, 'capabilities'>): boolean {
	return providerHasCapability(provider, 'Image');
}

export function hasDefaultProviderCapability(providerId: string, capability: string): boolean {
	const normalizedProviderId = normalizeProviderId(providerId);
	const provider = DEFAULT_PROVIDERS.find(
		(entry) => normalizeProviderId(entry.id) === normalizedProviderId
	);
	return provider ? providerHasCapability(provider, capability) : false;
}

export function getDefaultAgentModels(providerId: string): Model[] {
	return (DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] ?? []).map((model) => ({
		...model,
	}));
}

export function hasDefaultAgentModels(providerId: string): boolean {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] !== undefined;
}

function defaultModelsForProvider(providerId: string): readonly Model[] | undefined {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)];
}

export function isAllowedAgentModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	const defaultModels = defaultModelsForProvider(providerId);

	if (defaultModels) {
		return defaultModels.some((model) => model.id === normalizedModelId);
	}

	return true;
}

export function filterSelectableAgentModels(providerId: string, models: Model[]): Model[] {
	const defaultModels = defaultModelsForProvider(providerId);
	if (!defaultModels) {
		return models;
	}

	const byId = new Map(models.map((model) => [model.id.trim(), model]));
	return defaultModels.flatMap((defaultModel) => {
		const model = byId.get(defaultModel.id);
		return model ? [model] : [];
	});
}
