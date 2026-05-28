export function createSafeMcpEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
	const safe: NodeJS.ProcessEnv = { ...process.env };
	for (const [key, value] of Object.entries(env)) {
		const normalizedKey = key.trim();
		if (normalizedKey) safe[normalizedKey] = value;
	}
	return safe;
}
