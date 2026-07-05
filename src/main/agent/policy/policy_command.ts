// Commands with shell control operators or redirections are never reduced to a
// base name: an allowlisted `git` must not smuggle in `git status && rm -rf ~`.
const SHELL_CONTROL = /[;&|<>`\n]|\$\(/;

export function toolCommandName(args: Record<string, unknown>): string | undefined {
	const raw = args.command;
	if (typeof raw !== 'string') return undefined;
	if (SHELL_CONTROL.test(raw)) return undefined;
	const first = raw.trim().split(/\s+/)[0];
	return first || undefined;
}
