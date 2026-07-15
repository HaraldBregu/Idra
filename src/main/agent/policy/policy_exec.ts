// Binaries that delete, relocate, or rewrite files, processes, or the system.
const DESTRUCTIVE_BINS = new Set([
	'rm',
	'rmdir',
	'mv',
	'cp',
	'dd',
	'ln',
	'shred',
	'truncate',
	'tee',
	'chmod',
	'chown',
	'chgrp',
	'kill',
	'killall',
	'pkill',
	'sudo',
	'su',
	'shutdown',
	'reboot',
	'halt',
]);

// A ">"/">>" redirection into a real file; fd dups (2>&1) and /dev/null stay safe.
const FILE_REDIRECT = />{1,2}(?!&)\s*(?!\/dev\/null(?:\s|$))\S/;

// ponytail: first-token heuristic over |/&/;-split segments. Wrappers
// (bash -c, xargs, $(...)) and quoted operators slip past or over-ask; the
// upgrade path is a real shell parser. Prompts are UX here, not a sandbox.
export function isDestructiveCommand(command: string): boolean {
	return command.split(/[|&;\n]+/).some((segment) => {
		const part = segment.trim();
		if (FILE_REDIRECT.test(part)) return true;
		const words = part.split(/\s+/).filter(Boolean);
		while (words.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
		const bin = (words[0] ?? '').replace(/^[($`]+/, '').split('/').pop() ?? '';
		if (DESTRUCTIVE_BINS.has(bin)) return true;
		if ((bin === 'sed' || bin === 'perl') && /\s-\S*i/.test(part)) return true;
		return bin === 'find' && /\s-delete\b/.test(part);
	});
}
