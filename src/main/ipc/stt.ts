import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand } from './core/gateway';
import { SttChannels } from '../../shared/ipc/ipc-channels';
import { SttService } from '../services/stt-service';

export class SttIpc implements IpcModule {
	readonly name = 'stt';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const stt = container.get(SttService);
		registerCommand(SttChannels.transcribe, (request) => stt.transcribe(request));
	}
}
