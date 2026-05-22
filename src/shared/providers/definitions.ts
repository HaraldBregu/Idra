import { normalizeProviderId } from './models';

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
} as const satisfies Readonly<Record<string, ProviderApiConfiguration>>;

export const DEFAULT_PROVIDERS: readonly Provider[] = [
	{
		id: 'openai',
		name: 'OpenAI',
		baseUrl: 'https://api.openai.com/v1',
		apiKey: '',
		capabilities: 'Chat - Text-to-speech - Speech-to-text',
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
		capabilities: 'Chat - Text-to-speech - Realtime voice/omni - Image - Video - Music/audio',
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
		capabilities: 'Chat - Speech-to-text - Realtime voice/omni - Image - Video',
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
		capabilities: 'Chat - Speech-to-text - Realtime voice/omni - Image - Video',
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
		id: 'minimax',
		name: 'MiniMax',
		baseUrl: 'https://api.minimax.io/v1',
		apiKey: '',
		capabilities: 'Chat - Text-to-speech - Video - Music/audio',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.minimax,
	},
	{
		id: 'elevenlabs',
		name: 'ElevenLabs',
		baseUrl: 'https://api.elevenlabs.io/v1',
		apiKey: '',
		capabilities: 'Speech-to-text - Text-to-speech - Music/audio',
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
		id: 'kling',
		name: 'Kuaishou / Kling AI',
		baseUrl: 'https://kling.ai',
		apiKey: '',
		capabilities: 'Video - Music/audio',
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
		capabilities: 'Realtime voice/omni - Image - Video - 3D',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.luma,
	},
	{
		id: 'stability-ai',
		name: 'Stability AI',
		baseUrl: 'https://api.stability.ai/v2beta',
		apiKey: '',
		capabilities: 'Image - Video - Music/audio',
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
		capabilities: 'Music/audio',
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
		id: 'perplexity',
		name: 'Perplexity',
		baseUrl: 'https://api.perplexity.ai',
		apiKey: '',
		capabilities: 'Research chat',
		apiConfiguration: PROVIDER_API_CONFIGURATIONS.perplexity,
	},
];

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
