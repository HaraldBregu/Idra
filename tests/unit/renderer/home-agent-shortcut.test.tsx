import { fireEvent, render } from '@testing-library/react';
import { ChatSessionContext } from '../../../src/renderer/src/contexts/chat-session';
import { useHomeAgent } from '../../../src/renderer/src/pages/home/hooks/useHomeAgent';

jest.mock('../../../src/renderer/src/pages/home/context', () => ({
	useHomeAgentContext: () => ({ chatState: {}, dispatchChat: jest.fn() }),
}));

it.each([
	['Command+N', { metaKey: true }],
	['Ctrl+N', { ctrlKey: true }],
])('creates a new chat session when %s is pressed', (_label, modifier) => {
	const setSessionId = jest.fn();
	const sessionId = '00000000-0000-4000-8000-000000000001';
	Object.defineProperty(globalThis.crypto, 'randomUUID', {
		configurable: true,
		value: jest.fn(() => sessionId),
	});

	function TestHomeAgent(): null {
		useHomeAgent({ setMode: jest.fn() });
		return null;
	}

	render(
		<ChatSessionContext.Provider value={{ sessionId: 'home', setSessionId }}>
			<TestHomeAgent />
		</ChatSessionContext.Provider>
	);

	fireEvent.keyDown(window, { key: 'n', ...modifier });

	expect(setSessionId).toHaveBeenCalledWith(sessionId);
});
