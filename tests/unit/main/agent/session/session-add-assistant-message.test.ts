import { addAssistantMessage } from '../../../../../src/main/agent/session/session_add_assistant_message';
import { createSessionState } from '../../../../../src/main/agent/session/session_module_state';

it('does not persist an empty assistant turn produced by interruption', () => {
	const state = createSessionState();
	state.messages = [{ role: 'user', content: 'request' }];

	addAssistantMessage(
		state,
		'',
		[],
		[{ type: 'provider_item', provider: 'openai', item: { type: 'reasoning' } }]
	);

	expect(state.messages).toEqual([{ role: 'user', content: 'request' }]);
});
