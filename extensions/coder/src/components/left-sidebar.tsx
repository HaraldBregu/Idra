import { Clock3, Code2, FolderGit2, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { FileTree } from '@/components/file-tree';
import { Button } from '@/components/ui/button';
import type { CoderController } from '@/types';

export function LeftSidebar({ coder }: { coder: CoderController }) {
	const [query, setQuery] = useState('');
	const visibleSessions = coder.sessions.filter((session) =>
		session.title.toLowerCase().includes(query.trim().toLowerCase())
	);

	return (
		<div className="coder-sidebar-inner">
			<div className="coder-brand">
				<div className="coder-brand-mark"><Code2 /></div>
				<div><strong>Coder</strong><span>Agent workspace</span></div>
			</div>
			<Button className="coder-new-task" onClick={coder.createSession}>
				<Plus /> New task <kbd>⌘N</kbd>
			</Button>
			<label className="coder-search">
				<Search />
				<span className="sr-only">Search tasks</span>
				<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" />
			</label>

			<section className="coder-sidebar-section coder-sessions">
				<header><span>Tasks</span><span>{visibleSessions.length}</span></header>
				<div className="coder-session-list" role="list">
					{coder.sessionsLoading ? <p className="coder-sidebar-empty">Loading tasks…</p> : null}
					{!coder.sessionsLoading && visibleSessions.length === 0 ? (
						<p className="coder-sidebar-empty">No saved coding tasks</p>
					) : null}
					{visibleSessions.map((session) => (
						<button
							key={session.id}
							type="button"
							className={session.id === coder.activeSessionId ? 'is-selected' : undefined}
							onClick={() => void coder.selectSession(session.id)}
						>
							<span className="coder-session-icon"><Clock3 /></span>
							<span><strong>{session.title}</strong><small>{new Date(session.createdAtMs).toLocaleDateString()}</small></span>
						</button>
					))}
				</div>
			</section>

			<section className="coder-sidebar-section coder-files">
				<header><span>Workspace</span><FolderGit2 /></header>
				{coder.filesLoading ? <p className="coder-sidebar-empty">Loading files…</p> : null}
				{!coder.filesLoading && coder.files.length === 0 ? (
					<p className="coder-sidebar-empty">No workspace files</p>
				) : (
					<FileTree
						entries={coder.files}
						onSelect={(path) => void coder.selectFile(path)}
						selectedPath={coder.selectedFilePath}
					/>
				)}
			</section>

			<footer className="coder-workspace-path" title={coder.workspaceLocation}>
				<span>{coder.workspaceName}</span>
				<small>{coder.isPreview ? 'Browser preview' : 'Local workspace'}</small>
			</footer>
		</div>
	);
}
