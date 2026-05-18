import type React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type {
	AgentPendingEventPayload,
	AgentResponseEvent,
} from '../../../../../src/shared/service';
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
	let responseListener: ((event: AgentResponseEvent) => void) | undefined;
	let resolveSend: ((response: string) => void) | undefined;

	beforeEach(() => {
		pendingListener = undefined;
		responseListener = undefined;
		resolveSend = undefined;
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
			onResponse: jest.fn((listener) => {
				responseListener = listener;
				return jest.fn();
			}),
			cancel: jest.fn(async () => undefined),
			reset: jest.fn(async () => undefined),
			send: jest.fn(() => new Promise<string>((resolve) => {
				resolveSend = resolve;
			})),
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

	it('ignores response streams for non-home agents', async () => {
		const { result } = renderHook(() => useHomeAgent({ setMode: jest.fn() }), { wrapper });

		await waitFor(() => expect(responseListener).toBeDefined());
		act(() => {
			result.current.setInput('hello');
		});
		act(() => {
			result.current.handleSubmit();
		});
		await waitFor(() => expect(result.current.isLoading).toBe(true));

		act(() => {
			responseListener?.({
				type: 'text_delta',
				agentId: 'cron:job-1',
				runId: 'run-1',
				delta: 'cron output',
			});
		});

		expect(JSON.stringify(result.current.chatState.messages)).not.toContain('cron output');
		await act(async () => {
			resolveSend?.('main output');
		});
	});
});
