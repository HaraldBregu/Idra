import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand } from './core/gateway';
import { SpeechChannels } from '../../shared/ipc/ipc-channels';
import type { SpeechService } from '../speech';

export interface SpeechIpcDeps {
	speech: SpeechService;
}

export class SpeechIpc implements IpcModule<SpeechIpcDeps> {
	readonly name = 'speech';

	register({ speech }: SpeechIpcDeps, _eventBus: EventBus): void {
		registerCommand(SpeechChannels.synthesize, (request) => speech.synthesize(request));
	}
}
