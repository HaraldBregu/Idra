const readState = jest.fn();
const writeState = jest.fn();

jest.mock('../../../../../src/main/app/tasks/tasks_read_state', () => ({ readState }));
jest.mock('../../../../../src/main/app/tasks/tasks_write_state', () => ({ writeState }));

import { getRuntime } from '../../../../../src/main/app/tasks/tasks_get_runtime';
import { setRuntime } from '../../../../../src/main/app/tasks/tasks_set_runtime';
import type { PersistedTaskState } from '../../../../../src/main/app/tasks/tasks_types';

beforeEach(() => {
	readState.mockReset();
	writeState.mockReset();
});

it('reads the runtime from top-level provider and model fields', () => {
	readState.mockReturnValue({ providerId: 'openai', modelId: 'gpt-5', schedules: [] });

	expect(getRuntime()).toEqual({ providerId: 'openai', modelId: 'gpt-5' });
});

it('stores the runtime as top-level provider and model fields', () => {
	const state: PersistedTaskState = { schedules: [] };
	writeState.mockImplementation((mutate: (value: PersistedTaskState) => unknown) => mutate(state));

	expect(setRuntime(' openai ', ' gpt-5 ')).toEqual({ providerId: 'openai', modelId: 'gpt-5' });
	expect(state).toEqual({ providerId: 'openai', modelId: 'gpt-5', schedules: [] });
});
