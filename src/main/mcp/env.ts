const SAFE_ENV_KEYS = ['PATH', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TMPDIR', 'TEMP', 'TMP', 'NODE_ENV'];

export function createSafeMcpEnv(extraEnv: Record<string, string> = {}): Record<string, string> {
	const safeEnv: Record<string, string> = {};

	for (const key of SAFE_ENV_KEYS) {
		const value = process.env[key];
		if (typeof value === 'string') {
			safeEnv[key] = value;
		}
	}

	for (const [key, value] of Object.entries(extraEnv)) {
		if (!key.trim()) continue;
		safeEnv[key.trim()] = value;
	}

	return safeEnv;
}
