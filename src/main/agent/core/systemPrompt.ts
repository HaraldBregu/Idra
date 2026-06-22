export abstract class SystemPrompt {
	protected prompt: string;

	constructor(initialPrompt = '') {
		this.prompt = initialPrompt;
	}

	getPrompt(): string {
		return this.prompt;
	}

	abstract build(): Promise<string>;
}
