import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadMessagesBySessionId } from '../../../../src/main/agent/session/session_load_messages_by_session_id';
import { realtimeVoiceConversationFactory } from '../../../../src/main/realtime_voice/conversation';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

it('persists only finalized voice transcripts at their reserved turn position', () => {
	const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-voice-conversation-'));
	const location = path.join(temporaryRoot, 'agent');
	try {
		const conversation = realtimeVoiceConversationFactory({ location })(SESSION_ID, 'model');
		conversation.beginUserTurn('user-1');
		conversation.addAssistantTranscript('First answer.');
		expect(loadMessagesBySessionId(SESSION_ID, location)).toEqual([
			expect.objectContaining({ role: 'assistant' }),
		]);

		conversation.finalizeUserTurn('user-1', 'First spoken message.');
		conversation.finalizeUserTurn('user-2', 'Second spoken message.');
		conversation.addAssistantTranscript('Second answer.');
		conversation.beginUserTurn('user-2');

		const messages = loadMessagesBySessionId(SESSION_ID, location);
		expect(messages.map((message) => message.role)).toEqual([
			'user',
			'assistant',
			'user',
			'assistant',
		]);
		expect(messages[0].content).toBe('First spoken message.');
		expect(messages[2].content).toBe('Second spoken message.');
		expect(JSON.stringify(messages)).not.toContain('Voice message');
	} finally {
		fs.rmSync(temporaryRoot, { recursive: true, force: true });
	}
});
