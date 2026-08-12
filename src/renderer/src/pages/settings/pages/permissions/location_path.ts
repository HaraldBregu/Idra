export function locationPath(rule: string): string {
	if (!/[\\/]\*\*$/.test(rule)) return rule;
	const withoutGlob = rule.slice(0, -2);
	return /^([A-Za-z]:[\\/]|[\\/])$/.test(withoutGlob)
		? withoutGlob
		: withoutGlob.replace(/[\\/]$/, '');
}
