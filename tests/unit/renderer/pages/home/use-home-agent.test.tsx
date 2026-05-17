import type React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { AgentPendingEventPayload } from '../../../../../src/shared/service';
import { Provider } from '../../../../../src/renderer/src/pages/home/context';
import { useHomeAgent } from '../../../../../src/renderer/src/pages/home/hooks';

type AgentApi = Window['agent'];

function wrapper({ children }: React.PropsWithChildren): React.ReactElement {
	return <Provider>{children}</Provider>;
}

function pendingEvent(agentId = 'main'): AgentPendingEventPayload {
	return {
		agentId,
		approvals: [],
		inputs: [{ id: 'input-1', question: 'What path?' }],
	};
}

describe('useHomeAgent pending input state', () => {
	let pendingListener: ((event: AgentPendingEventPayload) => void) | undefined;

	beforeEach(() => {
		pendingListener = undefined;
		const agent: Partial<AgentApi> = {
			getHistory: jest.fn(async () => []),
			getPending: jest.fn(async () => ({
				approvals: [],
				inputs: pendingEvent().inputs,
			})),
			onPending: jest.fn((listener) => {
				pendingListener = listener;
				return jest.fn();
			}),
			onResponse: jest.fn(() => jest.fn()),
			cancel: jest.fn(async () => undefined),
			reset: jest.fn(async () => undefined),
			send: jest.fn(async () => ''),
			resolveApproval: jest.fn(async () => true),
			resolveInput: jest.fn(async () => true),
		};
		Object.defineProperty(window, 'agent', {
			configurable: true,
			value: agent,
		});
	});

	afterEach(() => {
		delete (window as Partial<Window>).agent;
	});

	it('loads pending inputs that existed before the page subscribed', async () => {
		const { result } = renderHook(() => useHomeAgent({ setMode: jest.fn() }), { wrapper });

		await waitFor(() => {
			expect(result.current.chatState.messages.some((message) => message.type === 'multi-select')).toBe(true);
		});
		expect(result.current.selectedOptions).toEqual({ 'agent-pending-i:input-1': [] });
	});

	it('ignores pending broadcasts for non-home agents', async () => {
		const { result } = renderHook(() => useHomeAgent({ setMode: jest.fn() }), { wrapper });

		await waitFor(() => expect(pendingListener).toBeDefined());
		pendingListener?.({ ...pendingEvent('worker-1'), inputs: [{ id: 'worker-input', question: 'Ignore?' }] });

		await waitFor(() => {
			expect(
				result.current.chatState.messages.some(
					(message) => message.type === 'multi-select' && message.id.includes('worker-input')
				)
			).toBe(false);
		});
	});
});
