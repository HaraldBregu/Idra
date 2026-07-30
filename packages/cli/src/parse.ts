export type TuiCommand =
	| { readonly kind: 'app' }
	| { readonly force: boolean; readonly kind: 'install'; readonly spec: string }
	| { readonly kind: 'clear' }
	| { readonly kind: 'help' }
	| { readonly kind: 'quit' }
	| { readonly input: string; readonly kind: 'unknown' };

export function parseTuiCommand(input: string): TuiCommand {
	const parts = input.trim().split(/\s+/);
	const name = parts.shift()?.toLowerCase() ?? '';

	if (name === '/app') return { kind: 'app' };
	if (name === '/clear') return { kind: 'clear' };
	if (name === '/help') return { kind: 'help' };
	if (name === '/quit' || name === '/exit') return { kind: 'quit' };
	if (name === '/install') {
		const force = parts.includes('--force') || parts.includes('-f');
		const packages = parts.filter((part) => part !== '--force' && part !== '-f');
		if (packages.length === 1) return { kind: 'install', spec: packages[0], force };
	}

	return { kind: 'unknown', input: input.trim() };
}
