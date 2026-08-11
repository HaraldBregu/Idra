import { BrowserWindow } from 'electron';
import { RealtimeVoiceChannels } from '../../shared/ipc_channels_definitions';
import type { EventBus } from '../event_bus';
import type { RealtimeVoiceManager } from '../realtime_voice';
import { registerCommandWithEvent } from './core/gateway';
import type { IpcModule } from './core/module';

export interface RealtimeVoiceIpcDependencies {
	realtimeVoice: RealtimeVoiceManager;
}

export class RealtimeVoiceIpc implements IpcModule<RealtimeVoiceIpcDependencies> {
	readonly name = 'realtime-voice';

	register({ realtimeVoice }: RealtimeVoiceIpcDependencies, _eventBus: EventBus): void {
		registerCommandWithEvent(RealtimeVoiceChannels.startSession, (event, request) =>
			realtimeVoice.start(windowId(event.sender), request)
		);
		registerCommandWithEvent(RealtimeVoiceChannels.appendAudio, (event, sessionId, audio) =>
			realtimeVoice.appendAudio(windowId(event.sender), sessionId, audio)
		);
		registerCommandWithEvent(RealtimeVoiceChannels.interruptSession, (event, sessionId) =>
			realtimeVoice.interrupt(windowId(event.sender), sessionId)
		);
		registerCommandWithEvent(RealtimeVoiceChannels.stopSession, (event, sessionId) =>
			realtimeVoice.stop(windowId(event.sender), sessionId)
		);
	}
}

function windowId(sender: Electron.WebContents): number {
	const window = BrowserWindow.fromWebContents(sender);
	if (!window || window.isDestroyed()) throw new Error('Realtime voice requires an active window.');
	return window.id;
}
