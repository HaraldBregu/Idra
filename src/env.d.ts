// env.d.ts
/// <reference types="vite/client" />

type AppEnvironment = 'development' | 'staging' | 'production';

interface ImportMetaEnv {
	// Environment
	readonly VITE_APP_ENV: AppEnvironment;

	readonly VITE_OPENAI_API_KEY: string;
	readonly VITE_OPENAI_MODEL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
