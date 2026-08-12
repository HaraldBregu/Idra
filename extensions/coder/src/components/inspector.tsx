import { Activity, CheckCircle2, FileCode2, Files, GitPullRequestArrow, LoaderCircle, ShieldAlert, XCircle } from 'lucide-react';

import type { CoderController, InspectorTab } from '@/types';

const tabs: Array<{ id: InspectorTab; label: string }> = [
	{ id: 'changes', label: 'Changes' },
	{ id: 'context', label: 'Context' },
	{ id: 'activity', label: 'Activity' },
];

export function Inspector({ coder }: { coder: CoderController }) {
	return (
		<div className="coder-inspector">
			<header className="coder-inspector-tabs" role="tablist" aria-label="Work inspector">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={coder.inspectorTab === tab.id}
						className={coder.inspectorTab === tab.id ? 'is-selected' : undefined}
						onClick={() => coder.setInspectorTab(tab.id)}
					>{tab.label}</button>
				))}
			</header>

			{coder.inspectorTab === 'changes' ? (
				<section className="coder-inspector-content">
					<div className="coder-inspector-heading"><div><GitPullRequestArrow /><span>Working changes</span></div><span>{coder.changedFiles.length}</span></div>
					{coder.changedFiles.length === 0 ? (
						<div className="coder-inspector-empty"><Files /><strong>No changes yet</strong><p>Files edited by Coder during this task will appear here.</p></div>
					) : (
						<ul className="coder-change-list">
							{coder.changedFiles.map((path) => (
								<li key={path}><button type="button" onClick={() => void coder.selectFile(path)}><FileCode2 /><span><strong>{path.split(/[\\/]/).at(-1)}</strong><small>{path}</small></span><em>M</em></button></li>
							))}
						</ul>
					)}
				</section>
			) : null}

			{coder.inspectorTab === 'context' ? (
				<section className="coder-inspector-content">
					<div className="coder-inspector-heading"><div><FileCode2 /><span>File context</span></div></div>
					{coder.selectedFilePath ? (
						<div className="coder-file-preview"><header>{coder.selectedFilePath}</header><pre>{coder.selectedFileContent || 'Loading file…'}</pre></div>
					) : (
						<div className="coder-inspector-empty"><FileCode2 /><strong>No file selected</strong><p>Choose a file from the workspace or changes list to inspect it here.</p></div>
					)}
				</section>
			) : null}

			{coder.inspectorTab === 'activity' ? (
				<section className="coder-inspector-content">
					<div className="coder-inspector-heading"><div><Activity /><span>Agent activity</span></div><span>{coder.activities.length}</span></div>
					{coder.permission ? <div className="coder-activity-alert"><ShieldAlert /><span><strong>Approval needed</strong><small>{coder.permission.toolName}</small></span></div> : null}
					{coder.activities.length === 0 ? (
						<div className="coder-inspector-empty"><Activity /><strong>No activity yet</strong><p>Commands, file edits, and checks will stream here.</p></div>
					) : (
						<ol className="coder-activity-list">
							{coder.activities.map((item) => (
								<li key={item.id}>
									{item.status === 'running' ? <LoaderCircle className="is-spinning" /> : item.status === 'ok' ? <CheckCircle2 /> : <XCircle />}
									<span><strong>{item.name}</strong><small>{item.detail}</small></span>
									{item.durationMs ? <time>{item.durationMs < 1000 ? `${item.durationMs}ms` : `${(item.durationMs / 1000).toFixed(1)}s`}</time> : null}
								</li>
							))}
						</ol>
					)}
				</section>
			) : null}

			<footer className="coder-inspector-footer"><span>Workspace access</span><strong>Enabled</strong></footer>
		</div>
	);
}
