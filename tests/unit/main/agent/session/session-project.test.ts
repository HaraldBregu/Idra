import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
	createSessionState,
	init,
	setProject,
} from '../../../../../src/main/agent/session';
import type { Config } from '../../../../../src/main/agent/types';

const SESSION_A = '11111111-1111-4111-8111-111111111111';
const SESSION_B = '22222222-2222-4222-8222-222222222222';
const SESSION_C = '33333333-3333-4333-8333-333333333333';

describe('session project', () => {
	let location: string;
	let config: Config;

	beforeEach(async () => {
		location = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-project-session-'));
		config = { location };
	});

	afterEach(async () => {
		await fs.rm(location, { recursive: true, force: true });
	});

	it('keeps each project selection with its session', () => {
		const state = createSessionState();
		init(state, config, { task: 'chat', message: '', sessionId: SESSION_A });
		setProject(state, 'alpha');

		init(state, config, { task: 'chat', message: '', sessionId: SESSION_B });
		expect(state.context.project).toBeUndefined();
		setProject(state, 'beta');

		init(state, config, { task: 'chat', message: '', sessionId: SESSION_A });
		expect(state.context.project).toBe('alpha');

		const restored = createSessionState();
		init(restored, config, { task: 'chat', message: '', sessionId: SESSION_B });
		expect(restored.context.project).toBe('beta');
	});

	it('starts a new session without a selected project', () => {
		const state = createSessionState();
		init(state, config, { task: 'chat', message: '', sessionId: SESSION_A });
		setProject(state, 'alpha');

		init(state, config, { task: 'chat', message: '', sessionId: SESSION_C });
		expect(state.context.project).toBeUndefined();
	});

	it('persists unloading for the current session', () => {
		const state = createSessionState();
		init(state, config, { task: 'chat', message: '', sessionId: SESSION_A });
		setProject(state, 'alpha');
		setProject(state);

		const restored = createSessionState();
		init(restored, config, { task: 'chat', message: '', sessionId: SESSION_A });
		expect(restored.context.project).toBeUndefined();
	});
});
