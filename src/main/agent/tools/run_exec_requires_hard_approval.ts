const INTERPRETER =
	/(?:^|[\s;&|()])(?:[^\s;&|()]*\/)?(?:ba|da|k|z)?sh\b|(?:^|[\s;&|()])(?:[^\s;&|()]*\/)?(?:python\d*(?:\.\d+)?|node|ruby|perl|php|osascript|pwsh|powershell)\b/i;
const DESTRUCTIVE_COMMAND =
	/(?:^|[\s;&|()])(?:(?:sudo|command|builtin|nohup)\s+|env(?:\s+[A-Za-z_][A-Za-z0-9_]*=[^\s]+)*\s+)*(?:[^\s;&|()]*\/)?(?:rm|rmdir|unlink|shred|mkfs(?:\.[a-z0-9]+)?|shutdown|reboot|halt|poweroff)\b/i;
const DESTRUCTIVE_GIT = /(?:^|[\s;&|()])git\s+(?:reset\s+--hard|clean\b)/i;
const DESTRUCTIVE_FIND = /(?:^|[\s;&|()])find\b[^;&|\n]*\s-delete(?:\s|$)/i;
const DESTRUCTIVE_DATABASE = /\b(?:drop\s+(?:table|database)|truncate\s+table)\b/i;
const IN_PLACE_OR_OVERWRITE =
	/(?:^|[\s;&|()])(?:sed\s+[^;&|\n]*-[A-Za-z]*i\b|tee\b)|(^|[^<])>{1,2}(?!=)/i;

export function execRequiresHardApproval(command: string): boolean {
	const canonical = command.trim();
	return (
		INTERPRETER.test(canonical) ||
		DESTRUCTIVE_COMMAND.test(canonical) ||
		DESTRUCTIVE_GIT.test(canonical) ||
		DESTRUCTIVE_FIND.test(canonical) ||
		DESTRUCTIVE_DATABASE.test(canonical) ||
		IN_PLACE_OR_OVERWRITE.test(canonical)
	);
}
