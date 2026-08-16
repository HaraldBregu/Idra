export function accessSessionCookie(cookieHeader: string | undefined): string | undefined {
	for (const value of cookieHeader?.split(';') ?? []) {
		const [name, ...parts] = value.trim().split('=');
		if (name === 'idra_session') return parts.join('=') || undefined;
	}
	return undefined;
}
