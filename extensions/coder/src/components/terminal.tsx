import { Check, CircleStop, LoaderCircle, ShieldAlert, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import type { CoderController } from '@/types';

export function Terminal({ coder }: { coder: CoderController }) {
	const outputRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const output = outputRef.current;
		if (output) output.scrollTop = output.scrollHeight;
	}, [coder.activities, coder.messages, coder.permission, coder.runLabel]);

	return (
		<div className="coder-terminal">
			<div ref={outputRef} className="terminal-output" role="log" aria-live="polite">
				<div className="terminal-banner">
					<strong>Friday Coder 1.0.0</strong>
					<span>workspace  {coder.workspaceLocation || 'not connected'}</span>
					<span>model      {coder.modelId}</span>
					<span>status     {coder.runLabel.toLowerCase()}</span>
				</div>

				{coder.messages.length === 0 ? (
					<p className="terminal-muted">Type a coding task below. Coder can inspect files, edit code, and run commands.</p>
				) : null}

				{coder.messages.map((message) => (
					<div key={message.id}>
						{message.role === 'assistant' &&
						message.id === coder.messages.at(-1)?.id &&
						coder.activities.length > 0 ? (
							<div className="terminal-activity" aria-label="Agent commands">
								{coder.activities.map((activity) => (
									<div key={activity.id} className={`terminal-command terminal-command--${activity.status}`}>
										{activity.status === 'running' ? (
											<LoaderCircle className="is-spinning" />
										) : activity.status === 'ok' ? (
											<Check />
										) : (
											<X />
										)}
										<strong>{activity.name}</strong>
										<span>{activity.detail}</span>
										{activity.durationMs ? (
											<time>{activity.durationMs < 1000 ? `${activity.durationMs}ms` : `${(activity.durationMs / 1000).toFixed(1)}s`}</time>
										) : null}
									</div>
								))}
							</div>
						) : null}
						<div className={`terminal-entry terminal-entry--${message.role}`}>
						{message.role === 'user' ? (
							<>
								<span className="terminal-prompt-label">{coder.workspaceName}</span>
								<span className="terminal-prompt-symbol">$</span>
								<pre>{message.content}</pre>
							</>
						) : (
							<>
								<span className="terminal-agent-label">coder</span>
								{message.content ? (
									<pre className={message.status === 'error' ? 'is-error' : undefined}>{message.content}</pre>
								) : (
									<span className="terminal-cursor" aria-label="Coder is working" />
								)}
							</>
						)}
						</div>
					</div>
				))}

				{coder.permission ? (
					<section className="terminal-permission" aria-label="Tool permission request">
						<div className="terminal-permission-copy">
							<ShieldAlert />
							<span><strong>permission required: {coder.permission.toolName}</strong><small>{coder.permission.detail}</small></span>
						</div>
						<div className="terminal-permission-actions">
							<Button size="sm" variant="outline" onClick={() => void coder.approvePermission('reject')}>deny</Button>
							<Button size="sm" variant="secondary" onClick={() => void coder.approvePermission('approve_always')}>always allow</Button>
							<Button size="sm" onClick={() => void coder.approvePermission('approve')}>allow once</Button>
						</div>
					</section>
				) : null}

				{coder.error ? <div className="terminal-error" role="alert">error: {coder.error}</div> : null}
			</div>

			<form
				className="terminal-input-row"
				onSubmit={(event) => {
					event.preventDefault();
					void coder.send();
				}}
			>
				<label htmlFor="coder-composer">
					<span>{coder.workspaceName}</span>
					<strong>$</strong>
				</label>
				<textarea
					id="coder-composer"
					value={coder.input}
					onChange={(event) => coder.setInput(event.target.value)}
					onKeyDown={(event) => {
						if (event.ctrlKey && event.key.toLowerCase() === 'c' && coder.runState !== 'idle') {
							event.preventDefault();
							coder.cancelRun();
							return;
						}
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							void coder.send();
						}
					}}
					placeholder="Describe a coding task…"
					aria-label="Terminal command"
					rows={1}
				/>
				{coder.runState === 'running' || coder.runState === 'approval' ? (
					<Button type="button" size="icon" variant="ghost" aria-label="Stop Coder" onClick={coder.cancelRun}><CircleStop /></Button>
				) : (
					<Button type="submit" size="sm" variant="ghost" disabled={!coder.input.trim()}>run</Button>
				)}
			</form>
			<footer className="terminal-statusbar">
				<span>{coder.runState === 'running' ? 'ctrl+c to stop' : 'enter to run · shift+enter for newline'}</span>
				<span>{coder.modelId} · workspace context</span>
			</footer>
		</div>
	);
}
