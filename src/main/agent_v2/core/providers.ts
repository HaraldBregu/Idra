import { AgentModel } from '../model';
import { Settings } from '../settings/settings';
import { SystemPrompt } from '../prompt/prompt';
import { Workspace } from '../workspace/workspace';
import { Container } from './container';
import { MODEL, SETTINGS, SYSTEM_PROMPT, WORKSPACE } from './tokens';

export function createAgentContainer(): Container {
	const container = new Container();

	container.register(WORKSPACE, { useFactory: () => new Workspace(), singleton: true });
	container.register(SETTINGS, {
		useFactory: (dependencies) => new Settings(dependencies.resolve(WORKSPACE)),
		singleton: true,
	});
	container.register(MODEL, { useClass: AgentModel, singleton: true });
	container.register(SYSTEM_PROMPT, {
		useFactory: (dependencies) => new SystemPrompt().useContainer(dependencies),
		singleton: true,
	});

	return container;
}
