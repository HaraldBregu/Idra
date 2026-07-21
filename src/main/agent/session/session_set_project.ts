import { writeFileSync } from 'node:fs';
import { ensureSession } from './session_ensure_session';
import { projectFilePath } from './session_project_file_path';
import type { SessionState } from './session_types';

export function setProject(state: SessionState, project?: string): void {
	state.context.project = project;
	if (!state.sessionsPath) return;
	ensureSession(state);
	writeFileSync(projectFilePath(state), `${JSON.stringify(project ?? null)}\n`, 'utf8');
}
