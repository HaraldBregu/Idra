import { BrowserWindow } from 'electron';
import { RealtimeVoiceChannels } from '../../shared/ipc_channels_definitions';
import type { EventBus } from '../event_bus';
import type { Conversation } from '../agent/conversation';
import { registerCommandWithEvent } from './core/gateway';
import type { IpcModule } from './core/module';

export interface RealtimeVoiceIpcDependencies {
	conversation: Conversation;
}

export class RealtimeVoiceIpc implements IpcModule<RealtimeVoiceIpcDependencies> {
	readonly name = 'realtime-voice';

	register({ conversation }: RealtimeVoiceIpcDependencies, _eventBus: EventBus): void {
		registerCommandWithEvent(RealtimeVoiceChannels.startSession, (event, request) =>
			conversation.execute({
				type: 'voice',
				action: 'start',
				windowId: windowId(event.sender),
				request,
			})
		);
		registerCommandWithEvent(RealtimeVoiceChannels.appendAudio, (event, sessionId, audio) =>
			conversation.execute({
				type: 'voice',
				action: 'append-audio',
				windowId: windowId(event.sender),
				sessionId,
				audio,
			})
		);
		registerCommandWithEvent(RealtimeVoiceChannels.interruptSession, (event, sessionId) =>
			conversation.execute({
				type: 'voice',
				action: 'interrupt',
				windowId: windowId(event.sender),
				sessionId,
			})
		);
		registerCommandWithEvent(RealtimeVoiceChannels.stopSession, (event, sessionId) =>
			conversation.execute({
				type: 'voice',
				action: 'stop',
				windowId: windowId(event.sender),
				sessionId,
			})
		);
	}
}

function windowId(sender: Electron.WebContents): number {
	const window = BrowserWindow.fromWebContents(sender);
	if (!window || window.isDestroyed()) throw new Error('Realtime voice requires an active window.');
	return window.id;
}
