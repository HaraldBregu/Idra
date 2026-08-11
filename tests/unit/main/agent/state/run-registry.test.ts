import { createSessionState } from '../../../../../src/main/agent/session';
import {
	admitRun,
	beginRun,
	cancelRun,
	completeRun,
	createRunRegistry,
	type AgentRunRequest,
} from '../../../../../src/main/agent/state';

const request = (id: string): AgentRunRequest => ({
	id,
	agentId: 'main',
	sessionId: `session-${id}`,
	category: 'main',
	message: `message ${id}`,
	options: {},
	queuedAt: 0,
});

describe('agent run registry', () => {
	it('rejects duplicate active run IDs', () => {
		const registry = createRunRegistry();
		admitRun(registry, request('one'));
		expect(() => admitRun(registry, request('one'))).toThrow("Agent run 'one' is already active.");
	});

	it('allows only queued to running and running to cancelling', () => {
		const registry = createRunRegistry();
		const record = admitRun(registry, request('one'));
		const session = createSessionState();

		expect(beginRun(record, session)).toBe(true);
		expect(beginRun(record, createSessionState())).toBe(false);
		expect(cancelRun(record, new Error('stop'))).toBe(true);
		expect(record.lifecycle).toEqual({ status: 'cancelling', reason: expect.any(Error), session });
		expect(cancelRun(record, new Error('again'))).toBe(false);
		expect(beginRun(record, createSessionState())).toBe(false);
	});

	it('cancels a queued record without attaching a session', () => {
		const registry = createRunRegistry();
		const record = admitRun(registry, request('queued'));

		expect(cancelRun(record, new Error('stop queued'))).toBe(true);
		expect(record.lifecycle).toEqual({ status: 'cancelling', reason: expect.any(Error) });
		expect(record.controller.signal.aborted).toBe(true);
	});

	it('removes only the exact completed record and does so once', () => {
		const registry = createRunRegistry();
		const older = admitRun(registry, request('shared'));

		expect(completeRun(registry, older)).toBe(true);
		const newer = admitRun(registry, request('shared'));
		expect(completeRun(registry, older)).toBe(false);
		expect(registry.get('shared')).toBe(newer);
		expect(completeRun(registry, newer)).toBe(true);
		expect(completeRun(registry, newer)).toBe(false);
	});

	it('tracks concurrent records independently without scalar current state', () => {
		const registry = createRunRegistry();
		const records = ['one', 'two', 'three'].map((id) => admitRun(registry, request(id)));

		expect([...registry.values()]).toEqual(records);
		expect(records.map((record) => record.lifecycle.status)).toEqual([
			'queued',
			'queued',
			'queued',
		]);
	});
});
