import type {
	RealtimeVoiceSession,
	RealtimeVoiceStartRequest,
} from '../../shared/realtime_voice';
import type { Agent, AgentSendOptions } from './agent';
import type { RealtimeVoiceManager } from './realtime_voice';

export interface TextConversationCommand {
	readonly type: 'text';
	readonly message: string;
	readonly agentId: string;
	readonly options: AgentSendOptions;
}

export interface VoiceStartCommand {
	readonly type: 'voice';
	readonly action: 'start';
	readonly windowId: number;
	readonly request: RealtimeVoiceStartRequest;
}

export type VoiceActionCommand =
	| {
			readonly type: 'voice';
			readonly action: 'append-audio';
			readonly windowId: number;
			readonly sessionId: string;
			readonly audio: string;
	  }
	| {
			readonly type: 'voice';
			readonly action: 'interrupt' | 'stop';
			readonly windowId: number;
			readonly sessionId: string;
	  }
	| { readonly type: 'voice'; readonly action: 'stop-window'; readonly windowId: number }
	| { readonly type: 'voice'; readonly action: 'stop-all' };

export type ConversationCommand = TextConversationCommand | VoiceStartCommand | VoiceActionCommand;

export class Conversation {
	constructor(
		private readonly agent: Pick<Agent, 'send'>,
		private readonly voice: RealtimeVoiceManager
	) {}

	execute(command: TextConversationCommand): Promise<string>;
	execute(command: VoiceStartCommand): Promise<RealtimeVoiceSession>;
	execute(command: VoiceActionCommand): Promise<void>;
	execute(command: ConversationCommand): Promise<string | RealtimeVoiceSession | void> {
		if (command.type === 'text') {
			return this.agent.send(command.message, command.agentId, command.options);
		}
		switch (command.action) {
			case 'start':
				return this.voice.start(command.windowId, command.request);
			case 'append-audio':
				return this.voice.appendAudio(command.windowId, command.sessionId, command.audio);
			case 'interrupt':
				return this.voice.interrupt(command.windowId, command.sessionId);
			case 'stop':
				return this.voice.stop(command.windowId, command.sessionId);
			case 'stop-window':
				return this.voice.stopWindow(command.windowId);
			case 'stop-all':
				return this.voice.stopAll();
		}
	}
}
