import { SystemPrompt } from '../../../../src/main/agent/loop/prompt';
import { Workspace } from '../../../../src/main/agent/core/workspace';

class TestWorkspace extends Workspace {
	constructor(
		private readonly userText: string,
		private readonly bootstrapText = 'Ask who the assistant should be and who the user is.'
	) {
		super();
	}

	getPath(): string {
		return '/tmp/friday-test';
	}

	getAgentText(): Promise<string> {
		return Promise.resolve('');
	}

	getBootstrapText(): Promise<string> {
		return Promise.resolve(this.bootstrapText);
	}

	getHeartbeatText(): Promise<string> {
		return Promise.resolve('');
	}

	getIdentityText(): Promise<string> {
		return Promise.resolve('');
	}

	getMemoryText(): Promise<string> {
		return Promise.resolve('');
	}

	getSoulText(): Promise<string> {
		return Promise.resolve('');
	}

	getToolsText(): Promise<string> {
		return Promise.resolve('');
	}

	getUserText(): Promise<string> {
		return Promise.resolve(this.userText);
	}
}

describe('SystemPrompt', () => {
	it('includes bootstrap when the user profile is empty', async () => {
		const prompt = await new SystemPrompt().build({
			workspace: new TestWorkspace('- **Name:**\n- **What to call them:**'),
		});

		expect(prompt).toContain('Ask who the assistant should be and who the user is.');
	});

	it('skips bootstrap when the user profile has a value', async () => {
		const prompt = await new SystemPrompt().build({
			workspace: new TestWorkspace('- **Name:** Harald\n- **What to call them:** Harald'),
		});

		expect(prompt).not.toContain('Ask who the assistant should be and who the user is.');
		expect(prompt).toContain('- **Name:** Harald');
	});
});
