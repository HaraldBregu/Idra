import { Skills } from './skills';

export abstract class System {
	protected prompt: string;
	protected skills: Skills;

	constructor(skills: Skills, initialPrompt = '') {
		this.skills = skills;
		this.prompt = initialPrompt;
	}

	getPrompt(): string {
		return this.prompt;
	}

	abstract build(): Promise<string>;
}
