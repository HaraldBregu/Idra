import path from 'node:path';

export function isPlanExecInputSafe(input: Record<string, unknown>, workspace: string): boolean {
	if (
		input.background === true ||
		input.elevated === true ||
		input.pty === true ||
		input.host === 'gateway' ||
		input.host === 'node' ||
		(Array.isArray(input.additionalRoots) && input.additionalRoots.length > 0)
	)
		return false;
	const workdir = typeof input.workdir === 'string' ? input.workdir : '.';
	if (/^(?:\\\\|\/\/|\\\\[?.]\\)/.test(workdir) || workdir.startsWith('~')) return false;
	const candidate = path.resolve(workspace, workdir);
	const relative = path.relative(workspace, candidate);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
