import { ArrowUp, Bot, Check, CircleStop, Code2, Command, ShieldAlert, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import type { CoderController } from '@/types';

export function Chat({ coder }: { coder: CoderController }) {
	return (
		<div className="coder-chat">
			<div className="coder-timeline" aria-live="polite">
				{coder.messages.length === 0 ? (
					<div className="coder-empty-state">
						<div className="coder-empty-icon"><Code2 /></div>
						<h1>What should we build?</h1>
						<p>Describe a feature, bug, or refactor. Coder can inspect the workspace, edit files, and run commands.</p>
						<div className="coder-starters">
							<button type="button" onClick={() => coder.setInput('Find and fix the failing tests in this workspace.')}>
								<Check /> Fix failing tests
							</button>
							<button type="button" onClick={() => coder.setInput('Review the current code and identify the highest-impact improvement.')}>
								<Sparkles /> Review this project
							</button>
							<button type="button" onClick={() => coder.setInput('Explain the architecture of this workspace and its main data flow.')}>
								<Command /> Explain the codebase
							</button>
						</div>
					</div>
				) : (
					<div className="coder-message-list">
						{coder.messages.map((message) => (
							<article key={message.id} className={`coder-message coder-message--${message.role}`}>
								<div className="coder-message-avatar">{message.role === 'assistant' ? <Bot /> : 'You'}</div>
								<div className="coder-message-body">
									<header>{message.role === 'assistant' ? 'Coder' : 'You'}</header>
									{message.content ? (
										<ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{message.content}</ReactMarkdown>
									) : (
										<div className="coder-thinking"><span /><span /><span /></div>
									)}
								</div>
							</article>
						))}
						{coder.error ? <div className="coder-error" role="alert">{coder.error}</div> : null}
					</div>
				)}
			</div>

			<div className="coder-compose-wrap">
				{coder.permission ? (
					<section className="coder-approval" aria-label="Tool permission request">
						<ShieldAlert />
						<div><strong>Approve {coder.permission.toolName}?</strong><p>{coder.permission.detail}</p></div>
						<div className="coder-approval-actions">
							<Button size="sm" variant="outline" onClick={() => void coder.approvePermission('reject')}>Deny</Button>
							<Button size="sm" variant="secondary" onClick={() => void coder.approvePermission('approve_always')}>Always allow</Button>
							<Button size="sm" onClick={() => void coder.approvePermission('approve')}>Allow once</Button>
						</div>
					</section>
				) : null}
				<form
					className="coder-composer"
					onSubmit={(event) => {
						event.preventDefault();
						void coder.send();
					}}
				>
					<textarea
						ref={coder.composerRef}
						value={coder.input}
						onChange={(event) => coder.setInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault();
								void coder.send();
							}
						}}
						placeholder="Ask Coder to build, fix, or explain…"
						aria-label="Coding task"
					/>
					<footer>
						<div className="coder-compose-meta"><span><Code2 /> Code</span><span>{coder.modelId}</span><span>Workspace context</span></div>
						{coder.runState === 'running' || coder.runState === 'approval' ? (
							<Button type="button" size="icon" variant="outline" aria-label="Stop Coder" onClick={coder.cancelRun}><CircleStop /></Button>
						) : (
							<Button type="submit" size="icon" aria-label="Send task" disabled={!coder.input.trim()}><ArrowUp /></Button>
						)}
					</footer>
				</form>
				<p className="coder-compose-hint"><kbd>Enter</kbd> to send · <kbd>Shift Enter</kbd> for a new line · <kbd>⌘ /</kbd> to focus</p>
			</div>
		</div>
	);
}
