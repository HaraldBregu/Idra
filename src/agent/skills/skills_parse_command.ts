export function parseSkillCommand(message: string): { message: string; explicitSkill?: string } {
	const match = message.match(/^\/skill\s+(\S+)\s*([\s\S]*)$/i);
	if (!match) return { message };
	const userInput = match[2].trim();
	return {
		message: userInput || 'Use the explicitly selected skill.',
		explicitSkill: match[1],
	};
}
