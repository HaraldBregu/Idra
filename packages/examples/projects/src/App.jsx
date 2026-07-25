import { useCallback, useEffect, useState } from 'react';

import { connected, projects, useRemote } from '@/lib/projects';
import Connect from '@/components/connect';
import ProjectForm from '@/components/project-form';
import ProjectList from '@/components/project-list';

const STATE_LABELS = {
	thinking: 'Thinking…',
	reasoning: 'Reasoning…',
	using_tools: 'Working…',
	answering: 'Answering…',
};

export default function App() {
	const [ready, setReady] = useState(connected());
	const [items, setItems] = useState([]);
	const [status, setStatus] = useState('');
	const [error, setError] = useState('');
	const [permission, setPermission] = useState(null);
	const [busy, setBusy] = useState(false);

	const handlers = {
		onState: (state) => setStatus(STATE_LABELS[state] ?? ''),
		onPermission: (event, respond) => setPermission({ event, respond }),
	};

	const call = useCallback(async (work) => {
		setBusy(true);
		setError('');
		try {
			return await work();
		} catch (cause) {
			setError(cause.message);
			return undefined;
		} finally {
			setBusy(false);
			setStatus('');
			setPermission(null);
		}
	}, []);

	const refresh = useCallback(
		() => call(async () => setItems(await projects.list(handlers))),
		[call]
	);

	useEffect(() => {
		if (ready) refresh();
	}, [ready, refresh]);

	if (!ready) {
		return (
			<Connect
				onConnect={async (options) => {
					await useRemote(options);
					setReady(true);
				}}
			/>
		);
	}

	return (
		<main className="app">
			<header className="app-header">
				<div>
					<h1>Projects</h1>
					<p className="muted">
						{items.length} project{items.length === 1 ? '' : 's'} · via @friday/sdk
					</p>
				</div>
				<button type="button" onClick={refresh} disabled={busy}>
					Refresh
				</button>
			</header>

			<ProjectForm
				disabled={busy}
				onCreate={(name, description) =>
					call(async () => {
						await projects.create(name, description, handlers);
						setItems(await projects.list(handlers));
					})
				}
			/>

			{status ? <p className="status">{status}</p> : null}
			{error ? <p className="error">{error}</p> : null}

			{permission ? (
				<div className="permission">
					<p>
						Allow <strong>{permission.event.toolName}</strong>?
					</p>
					<div className="permission-actions">
						<button type="button" onClick={() => permission.respond('approve')}>
							Approve
						</button>
						<button type="button" onClick={() => permission.respond('reject')}>
							Reject
						</button>
					</div>
				</div>
			) : null}

			<ProjectList
				items={items}
				disabled={busy}
				onUpdate={(name, description) =>
					call(async () => {
						await projects.update(name, description, handlers);
						setItems(await projects.list(handlers));
					})
				}
				onRemove={(name) =>
					call(async () => {
						await projects.remove(name, handlers);
						setItems(await projects.list(handlers));
					})
				}
			/>
		</main>
	);
}
