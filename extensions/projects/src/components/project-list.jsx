import { useState } from 'react';

export default function ProjectList({ items, disabled, onUpdate, onRemove }) {
	const [editing, setEditing] = useState(null);
	const [draft, setDraft] = useState('');

	if (items.length === 0) {
		return <p className="muted empty">No projects yet. Create one above.</p>;
	}

	return (
		<ul className="list">
			{items.map((project) => (
				<li key={project.name}>
					<div className="list-main">
						<h2>{project.title}</h2>
						{editing === project.name ? (
							<input
								autoFocus
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								onKeyDown={async (event) => {
									if (event.key === 'Escape') setEditing(null);
									if (event.key !== 'Enter') return;
									setEditing(null);
									await onUpdate(project.name, draft.trim());
								}}
							/>
						) : (
							<p className="muted">{project.description || 'No description'}</p>
						)}
					</div>
					<div className="list-actions">
						<button
							type="button"
							disabled={disabled}
							onClick={() => {
								setDraft(project.description ?? '');
								setEditing(editing === project.name ? null : project.name);
							}}
						>
							Edit
						</button>
						<button type="button" disabled={disabled} onClick={() => onRemove(project.name)}>
							Delete
						</button>
					</div>
				</li>
			))}
		</ul>
	);
}
