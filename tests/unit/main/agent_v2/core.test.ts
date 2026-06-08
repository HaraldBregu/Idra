import { createAgentContainer, SYSTEM_PROMPT, WORKSPACE } from '../../../../src/main/agent_v2';
import type { Workspace } from '../../../../src/main/agent_v2';

describe('agent_v2 dependency injection', () => {
	it('builds the system prompt with the injected workspace', async () => {
		const workspace = {
			hasBootstrapFile: jest.fn().mockResolvedValue(true),
		} as unknown as Workspace;
		const container = createAgentContainer();

		container.register(WORKSPACE, { useValue: workspace });

		const prompt = container.resolve(SYSTEM_PROMPT);
		const system = await prompt.build();

		expect(workspace.hasBootstrapFile).toHaveBeenCalledTimes(1);
		expect(system).toContain('A BOOTSTRAP.md file exists in the workspace');
	});
});
