import type { ChangeEvent } from 'react';

import type { EditorTab } from './types';

interface EditorProps {
	tab: EditorTab;
	source: string;
	configText: string;
	onTabChange: (tab: EditorTab) => void;
	onSourceChange: (source: string) => void;
	onConfigChange: (configText: string) => void;
	onImport: (file: File) => void;
}

export default function Editor({
	tab,
	source,
	configText,
	onTabChange,
	onSourceChange,
	onConfigChange,
	onImport,
}: EditorProps) {
	const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) onImport(file);
		event.target.value = '';
	};
	return (
		<section className="editor-panel" aria-label="Diagram editor">
			<div className="panel-bar">
				<div className="tabs" role="tablist" aria-label="Editor mode">
					<button
						className={tab === 'source' ? 'active' : ''}
						role="tab"
						aria-selected={tab === 'source'}
						onClick={() => onTabChange('source')}
					>
						Source
					</button>
					<button
						className={tab === 'config' ? 'active' : ''}
						role="tab"
						aria-selected={tab === 'config'}
						onClick={() => onTabChange('config')}
					>
						Config
					</button>
				</div>
				<label className="file-button">
					Import
					<input
						type="file"
						accept=".mmd,.mermaid,.md,.txt,text/plain,text/markdown"
						onChange={handleImport}
					/>
				</label>
			</div>
			{tab === 'source' ? (
				<textarea
					data-testid="diagram-source"
					aria-label="Mermaid source"
					spellCheck={false}
					value={source}
					onChange={(event) => onSourceChange(event.target.value)}
				/>
			) : (
				<div className="config-editor">
					<p>
						All Mermaid configuration keys are accepted. Friday enforces{' '}
						<code>securityLevel: strict</code>, <code>startOnLoad: false</code>, and suppressed
						error diagrams.
					</p>
					<textarea
						data-testid="diagram-config"
						aria-label="Mermaid JSON configuration"
						spellCheck={false}
						value={configText}
						onChange={(event) => onConfigChange(event.target.value)}
					/>
				</div>
			)}
		</section>
	);
}
