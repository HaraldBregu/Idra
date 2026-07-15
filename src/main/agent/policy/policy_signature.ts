// Maps an internal tool name to the name used in "Tool(pattern)" rules.
const RULE_TOOL_NAMES: Record<string, string> = {
	exec: 'Bash',
	read: 'Read',
	write: 'Write',
	edit: 'Edit',
};

// A tool call's rule signature, e.g. "Bash(rm -rf node_modules)" for the shell
// tool or "Read(/etc/passwd)" for a path tool. Undefined when the tool has no
// rule mapping or lacks the argument the rule keys on.
export function toolRuleSignature(
	toolName: string,
	args: Record<string, unknown>,
): string | undefined {
	const name = RULE_TOOL_NAMES[toolName];
	if (!name) return undefined;
	const inner = name === 'Bash' ? args.command : args.path;
	if (typeof inner !== 'string') return undefined;
	return `${name}(${inner})`;
}
