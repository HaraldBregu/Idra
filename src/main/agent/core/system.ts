import { Skills } from './skills';

export abstract class System {
	private _prompt: string;
	protected skills: Skills;

	constructor(skills: Skills, initialPrompt = '') {
		this.skills = skills;
		this._prompt = initialPrompt;
	}

	get prompt(): string {
		return this._prompt;
	}

	protected set prompt(value: string) {
		this._prompt = value;
	}

	abstract build(): Promise<string>;
}
