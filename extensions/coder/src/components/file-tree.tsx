import { ChevronRight, FileCode2, Folder } from 'lucide-react';
import type { WorkspaceTreeEntry } from '@friday/sdk';

interface FileTreeProps {
	depth?: number;
	entries: WorkspaceTreeEntry[];
	onSelect: (path: string) => void;
	selectedPath: string;
}

export function FileTree({ depth = 0, entries, onSelect, selectedPath }: FileTreeProps) {
	return (
		<ul className="coder-file-tree" style={{ '--tree-depth': depth } as React.CSSProperties}>
			{entries.map((entry) => (
				<li key={entry.path}>
					{entry.type === 'directory' ? (
						<details open={depth < 1}>
							<summary>
								<ChevronRight className="coder-tree-chevron" />
								<Folder />
								<span>{entry.name}</span>
							</summary>
							<FileTree
								depth={depth + 1}
								entries={entry.children ?? []}
								onSelect={onSelect}
								selectedPath={selectedPath}
							/>
						</details>
					) : (
						<button
							type="button"
							className={selectedPath === entry.path ? 'is-selected' : undefined}
							onClick={() => onSelect(entry.path)}
						>
							<FileCode2 />
							<span>{entry.name}</span>
						</button>
					)}
				</li>
			))}
		</ul>
	);
}
