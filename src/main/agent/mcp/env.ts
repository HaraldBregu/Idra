export function createSafeMcpEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
	const safe: NodeJS.ProcessEnv = {};
	for (const [key, value] of Object.entries(env)) {
		if (!/token|secret|password/i.test(key)) safe[key] = value;
	}
	return safe;
}
