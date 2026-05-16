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
		approvals: [
			{
				id: 'approval-1',
				kind: 'exec',
				toolName: 'exec',
				question: 'Approve?',
				title: 'Run command',
				command: 'printf ok',
				createdAtMs: Date.now(),
				expiresAtMs: Date.now() + 60_000,
				allowedDecisions: ['allow-once', 'deny'],
			},
		],
		inputs: [],
	};
}

describe('useHomeAgent HITL pending state', () => {
	let pendingListener: ((event: AgentPendingEventPayload) => void) | undefined;

	beforeEach(() => {
		pendingListener = undefined;
		const agent: Partial<AgentApi> = {
			getHistory: jest.fn(async () => []),
			getPending: jest.fn(async () => ({
				approvals: pendingEvent().approvals,
				inputs: [],
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

	it('loads pending approvals that existed before the page subscribed', async () => {
		const { result } = renderHook(() => useHomeAgent({ setMode: jest.fn() }), { wrapper });

		await waitFor(() => {
			expect(result.current.chatState.messages.some((message) => message.type === 'multi-select')).toBe(true);
		});
		expect(result.current.selectedOptions).toEqual({
			'agent-pending-a:approval-1': ['approval:approval-1:deny'],
		});
	});

	it('ignores pending broadcasts for non-home agents', async () => {
		const { result } = renderHook(() => useHomeAgent({ setMode: jest.fn() }), { wrapper });

		await waitFor(() => expect(pendingListener).toBeDefined());
		pendingListener?.({ ...pendingEvent('worker-1'), approvals: [{ ...pendingEvent('worker-1').approvals[0]!, id: 'worker-approval' }] });

		await waitFor(() => {
			expect(
				result.current.chatState.messages.some(
					(message) => message.type === 'multi-select' && message.id.includes('worker-approval')
				)
			).toBe(false);
		});
	});
});
