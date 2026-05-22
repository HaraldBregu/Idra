import type React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AgentResponseEvent } from '../../../../../src/shared/service';
import { Provider } from '../../../../../src/renderer/src/pages/home/context';
import { useHomeAgent } from '../../../../../src/renderer/src/pages/home/hooks';

type AgentApi = Window['agent'];

function wrapper({ children }: React.PropsWithChildren): React.ReactElement {
	return <Provider>{children}</Provider>;
}


describe('useHomeAgent response state', () => {
	let responseListener: ((event: AgentResponseEvent) => void) | undefined;
	let resolveSend: ((response: string) => void) | undefined;

	beforeEach(() => {
		responseListener = undefined;
		resolveSend = undefined;
		const agent: Partial<AgentApi> = {
			getHistory: jest.fn(async () => []),
			onResponse: jest.fn((listener) => {
				responseListener = listener;
				return jest.fn();
			}),
			cancel: jest.fn(async () => undefined),
			reset: jest.fn(async () => undefined),
			send: jest.fn(() => new Promise<string>((resolve) => {
				resolveSend = resolve;
			})),
		};
		Object.defineProperty(window, 'agent', {
			configurable: true,
			value: agent,
		});
	});

	afterEach(() => {
		delete (window as Partial<Window>).agent;
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
