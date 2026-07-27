import path from 'node:path';
import { sessionsRoot } from '../../../../../src/main/agent/session/session_sessions_root';
import { sessionPath } from '../../../../../src/main/agent/session/session_session_path';
import { sessionDir } from '../../../../../src/main/agent/session/session_session_dir';
import { messagesFilePath } from '../../../../../src/main/agent/session/session_messages_file_path';
import { runFilePath } from '../../../../../src/main/agent/session/session_run_file_path';
import { legacyFilePath } from '../../../../../src/main/agent/session/session_legacy_file_path';
import { messagesFile } from '../../../../../src/main/agent/session/session_messages_file';
import { createSessionState } from '../../../../../src/main/agent/session/session_module_state';
import type { SessionState } from '../../../../../src/main/agent/session/session_types';

function stateWith(sessionsPath: string, folderName: string): SessionState {
	return { ...createSessionState(), sessionsPath, folderName };
}

describe('sessionsRoot', () => {
	it('joins a resolved location with the shared sessions root', () => {
		expect(sessionsRoot('/tmp/agent')).toBe(path.join('/tmp/agent', 'sessions'));
	});
	it('resolves relative locations', () => {
		expect(sessionsRoot('agent')).toBe(path.join(path.resolve('agent'), 'sessions'));
	});
});

describe('sessionPath', () => {
	it('joins path with folder', () => {
		expect(sessionPath('/a/b', 'folder')).toBe(path.join('/a/b', 'folder'));
	});
});

describe('sessionDir / messagesFilePath / runFilePath', () => {
	const state = stateWith('/root/sessions/main', 'abc');
	it('sessionDir joins sessionsPath and folderName', () => {
		expect(sessionDir(state)).toBe(path.join('/root/sessions/main', 'abc'));
	});
	it('messagesFilePath appends messages.json', () => {
		expect(messagesFilePath(state)).toBe(path.join('/root/sessions/main', 'abc', 'messages.json'));
	});
	it('runFilePath appends run.jsonl', () => {
		expect(runFilePath(state)).toBe(path.join('/root/sessions/main', 'abc', 'run.jsonl'));
	});
});

describe('legacyFilePath', () => {
	it('sanitizes the id and appends .json', () => {
		expect(legacyFilePath('/root', 'a/b')).toBe(path.join('/root', 'a_b.json'));
	});
});

describe('messagesFile', () => {
	it('builds the messages.json path for a raw session id', () => {
		expect(messagesFile('/root', 'a/b')).toBe(path.join('/root', 'a_b', 'messages.json'));
	});
});

describe('createSessionState', () => {
	it('returns fresh default state', () => {
		const s = createSessionState();
		expect(s.maxTurns).toBe(20);
		expect(s.numTurns).toBe(0);
		expect(s.model).toBe('default');
		expect(s.messages).toEqual([]);
		expect(s.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
		expect(s.context).toEqual({ toolsContext: {} });
	});
	it('returns a new object each call', () => {
		expect(createSessionState()).not.toBe(createSessionState());
	});
});
