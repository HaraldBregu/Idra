import { Bot, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import type { WorkspaceTreeEntry } from '@friday/sdk';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { workspaceMoveError } from '@/lib/drop';
import { showNativeContextMenu } from '@/lib/menu';
import { rebaseWorkspacePath } from '@/lib/rebase';
import { collectDirectoryPaths } from '@/lib/tree';
import { isWorkspacePathWithin } from '@/lib/within';

const agentFilePaths = [
	'AGENTS.md',
	'HEALTH.md',
	'IDENTITY.md',
	'MEMORY.md',
	'SOUL.md',
	'USER.md',
] as const;
const agentFilePathSet = new Set<string>(agentFilePaths);

function WorkspaceTree({
	expanded,
	files,
	loading,
	error,
	draggedPath,
	dropError,
	dropTargetPath,
	movingPath,
	onCreateRequest,
	onDeleteRequest,
	onDragEnd,
	onDragLeave,
	onDragOver,
	onDragStart,
	onDrop,
	onSelect,
	onToggle,
	selectedPath,
	showEmpty,
}: {
	expanded: Set<string>;
	files: WorkspaceTreeEntry[];
	loading: boolean;
	error: string;
	draggedPath: string | null;
	dropError: string;
	dropTargetPath: string | null;
	movingPath: string | null;
	onCreateRequest: (parentPath: string, type: 'file' | 'directory') => void;
	onDeleteRequest: (entry: WorkspaceTreeEntry) => void;
	onDragEnd: () => void;
	onDragLeave: (event: DragEvent<HTMLElement>, path: string) => void;
	onDragOver: (event: DragEvent<HTMLElement>, entry: WorkspaceTreeEntry) => void;
	onDragStart: (event: DragEvent<HTMLElement>, entry: WorkspaceTreeEntry) => void;
	onDrop: (event: DragEvent<HTMLElement>, entry: WorkspaceTreeEntry) => void;
	onSelect: (entry: WorkspaceTreeEntry) => void;
	onToggle: (path: string) => void;
	selectedPath: string | null;
	showEmpty: boolean;
}) {
	return (
		<div>
			{loading ? (
				<div className="px-3 py-2 text-[12px] text-sidebar-muted">Loading files...</div>
			) : error ? (
				<div className="px-3 py-2 text-[12px] leading-5 text-sidebar-muted">{error}</div>
			) : files.length === 0 && showEmpty ? (
				<div className="px-3 py-2 text-[12px] text-sidebar-muted">No files</div>
			) : (
				<ul className="space-y-0.5">
					{files.map((entry) => (
						<WorkspaceTreeItem
							key={entry.path}
							depth={0}
							draggedPath={draggedPath}
							dropError={dropError}
							dropTargetPath={dropTargetPath}
							entry={entry}
							expanded={expanded}
							movingPath={movingPath}
							onCreateRequest={onCreateRequest}
							onDeleteRequest={onDeleteRequest}
							onDragEnd={onDragEnd}
							onDragLeave={onDragLeave}
							onDragOver={onDragOver}
							onDragStart={onDragStart}
							onDrop={onDrop}
							onToggle={onToggle}
							onSelect={onSelect}
							selectedPath={selectedPath}
						/>
					))}
				</ul>
			)}
		</div>
	);
}

interface AppSidebarProps {
	onCreateRequest: (parentPath: string, type: 'file' | 'directory') => void;
	onDeleteRequest: (entry: WorkspaceTreeEntry) => void;
	onMoveRequest: (entry: WorkspaceTreeEntry, destinationPath: string) => Promise<string>;
	onWorkspaceSelect: (entry: WorkspaceTreeEntry) => void;
	selectedWorkspacePath: string | null;
	workspaceError: string;
	workspaceFiles: WorkspaceTreeEntry[];
	workspaceLoading: boolean;
	workspaceLocation: string;
}

function WorkspaceTreeItem({
	depth,
	draggedPath,
	dropError,
	dropTargetPath,
	entry,
	expanded,
	movingPath,
	onCreateRequest,
	onDeleteRequest,
	onDragEnd,
	onDragLeave,
	onDragOver,
	onDragStart,
	onDrop,
	onToggle,
	onSelect,
	selectedPath,
}: {
	depth: number;
	draggedPath: string | null;
	dropError: string;
	dropTargetPath: string | null;
	entry: WorkspaceTreeEntry;
	expanded: Set<string>;
	movingPath: string | null;
	onCreateRequest: (parentPath: string, type: 'file' | 'directory') => void;
	onDeleteRequest: (entry: WorkspaceTreeEntry) => void;
	onDragEnd: () => void;
	onDragLeave: (event: DragEvent<HTMLElement>, path: string) => void;
	onDragOver: (event: DragEvent<HTMLElement>, entry: WorkspaceTreeEntry) => void;
	onDragStart: (event: DragEvent<HTMLElement>, entry: WorkspaceTreeEntry) => void;
	onDrop: (event: DragEvent<HTMLElement>, entry: WorkspaceTreeEntry) => void;
	onToggle: (path: string) => void;
	onSelect: (entry: WorkspaceTreeEntry) => void;
	selectedPath: string | null;
}) {
	const isDirectory = entry.type === 'directory';
	const isExpanded = expanded.has(entry.path);
	const selected = selectedPath === entry.path;
	const isDropTarget = dropTargetPath === entry.path;
	const Icon = isDirectory ? (isExpanded ? FolderOpen : Folder) : File;

	const trigger = (
		<Button
			data-workspace-entry
			type="button"
			variant="ghost"
			size="sm"
			draggable={!movingPath}
			onDragStart={(event) => onDragStart(event, entry)}
			onDragEnd={onDragEnd}
			onDragOver={(event) => onDragOver(event, entry)}
			onDragLeave={(event) => onDragLeave(event, entry.path)}
			onDrop={(event) => onDrop(event, entry)}
			onContextMenu={(event) => {
				showNativeContextMenu(
					event,
					[
						{
							id: isDirectory ? 'toggle' : 'open',
							label: isDirectory ? (isExpanded ? 'Collapse' : 'Expand') : 'Open',
							enabled: !isDirectory || Boolean(entry.children?.length),
						},
						...(isDirectory
							? ([
									{ type: 'separator' },
									{ id: 'new-file', label: 'New File' },
									{ id: 'new-folder', label: 'New Folder' },
								] as const)
							: []),
						{ type: 'separator' },
						{ id: 'copy-path', label: 'Copy Path' },
						{ type: 'separator' },
						{
							id: 'delete',
							label: isDirectory ? 'Delete Folder' : 'Delete File',
						},
					],
					{
						toggle: () => onToggle(entry.path),
						open: () => onSelect(entry),
						'new-file': () => onCreateRequest(entry.path, 'file'),
						'new-folder': () => onCreateRequest(entry.path, 'directory'),
						'copy-path': () => navigator.clipboard.writeText(entry.path),
						delete: () => onDeleteRequest(entry),
					}
				);
			}}
			onClick={() => {
				if (!isDirectory) onSelect(entry);
			}}
			onKeyDown={(event) => {
				if (event.key === 'Backspace' || event.key === 'Delete') {
					event.preventDefault();
					onDeleteRequest(entry);
				}
			}}
			aria-expanded={isDirectory ? isExpanded : undefined}
			aria-current={selected ? 'page' : undefined}
			aria-keyshortcuts="Backspace Delete"
			aria-busy={movingPath === entry.path || undefined}
			title={entry.path}
			className={cn(
				'h-7 w-full justify-start gap-1.5 rounded-md px-0 pr-2 text-left text-[12px] font-medium text-sidebar-muted',
				'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-0',
				selected && 'bg-sidebar-accent text-sidebar-foreground',
				draggedPath === entry.path && 'opacity-45',
				movingPath === entry.path && 'animate-pulse',
				isDropTarget &&
					!dropError &&
					'bg-sidebar-accent text-sidebar-foreground ring-1 ring-sidebar-ring',
				isDropTarget && dropError && 'ring-1 ring-destructive'
			)}
			style={{ paddingLeft: `${8 + depth * 14}px` }}
		>
			{isDirectory ? (
				<ChevronRight
					className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isExpanded && 'rotate-90')}
					strokeWidth={1.8}
				/>
			) : (
				<span className="h-3.5 w-3.5 shrink-0" />
			)}
			<Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
			<span className="min-w-0 flex-1 truncate">{entry.name}</span>
		</Button>
	);

	if (!isDirectory) return <li>{trigger}</li>;

	return (
		<Collapsible asChild open={isExpanded} onOpenChange={() => onToggle(entry.path)}>
			<li>
				<CollapsibleTrigger asChild>{trigger}</CollapsibleTrigger>
				<CollapsibleContent asChild>
					<ul className="space-y-0.5">
						{entry.children?.map((child) => (
							<WorkspaceTreeItem
								key={child.path}
								depth={depth + 1}
								draggedPath={draggedPath}
								dropError={dropError}
								dropTargetPath={dropTargetPath}
								entry={child}
								expanded={expanded}
								movingPath={movingPath}
								onCreateRequest={onCreateRequest}
								onDeleteRequest={onDeleteRequest}
								onDragEnd={onDragEnd}
								onDragLeave={onDragLeave}
								onDragOver={onDragOver}
								onDragStart={onDragStart}
								onDrop={onDrop}
								onToggle={onToggle}
								onSelect={onSelect}
								selectedPath={selectedPath}
							/>
						))}
					</ul>
				</CollapsibleContent>
			</li>
		</Collapsible>
	);
}

export function AppSidebar({
	onCreateRequest,
	onDeleteRequest,
	onMoveRequest,
	onWorkspaceSelect,
	selectedWorkspacePath,
	workspaceError,
	workspaceFiles,
	workspaceLoading,
	workspaceLocation,
}: AppSidebarProps) {
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const [agentExpanded, setAgentExpanded] = useState(false);
	const [draggedEntry, setDraggedEntry] = useState<WorkspaceTreeEntry | null>(null);
	const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
	const [dropError, setDropError] = useState('');
	const [dragMessage, setDragMessage] = useState('');
	const [movingPath, setMovingPath] = useState<string | null>(null);
	const agentFiles = useMemo(
		() =>
			agentFilePaths.flatMap((path) => {
				const entry = workspaceFiles.find(
					(candidate) => candidate.type === 'file' && candidate.path === path
				);
				return entry ? [entry] : [];
			}),
		[workspaceFiles]
	);
	const regularFiles = useMemo(
		() =>
			workspaceFiles.filter((entry) => entry.type !== 'file' || !agentFilePathSet.has(entry.path)),
		[workspaceFiles]
	);
	const workspaceName = useMemo(() => {
		if (!workspaceLocation) return 'Workspace';
		return workspaceLocation.split(/[\\/]/).filter(Boolean).pop() ?? workspaceLocation;
	}, [workspaceLocation]);

	function toggleDirectory(path: string) {
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});
	}

	function startDrag(event: DragEvent<HTMLElement>, entry: WorkspaceTreeEntry) {
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('application/x-friday-workspace-entry', entry.path);
		event.dataTransfer.setData('text/plain', entry.path);
		setDraggedEntry(entry);
		setDropTargetPath(null);
		setDropError('');
		setDragMessage(`Moving ${entry.name}. Drop it onto a folder or the workspace root.`);
	}

	function endDrag() {
		setDraggedEntry(null);
		setDropTargetPath(null);
		setDropError('');
	}

	function dragOverEntry(event: DragEvent<HTMLElement>, entry: WorkspaceTreeEntry) {
		if (!draggedEntry || movingPath) return;
		event.preventDefault();
		event.stopPropagation();
		const error =
			entry.type === 'directory'
				? workspaceMoveError(draggedEntry, entry.path, entry.children ?? [])
				: 'Drop onto a folder or an empty area to move this item.';
		event.dataTransfer.dropEffect = error ? 'none' : 'move';
		setDropTargetPath(entry.path);
		setDropError(error);
	}

	function dragLeaveTarget(event: DragEvent<HTMLElement>, path: string) {
		if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
			return;
		}
		if (dropTargetPath === path) {
			setDropTargetPath(null);
			setDropError('');
		}
	}

	async function moveEntry(
		event: DragEvent<HTMLElement>,
		destinationPath: string,
		destinationEntries: WorkspaceTreeEntry[]
	) {
		if (!draggedEntry || movingPath) return;
		event.preventDefault();
		event.stopPropagation();
		const error = workspaceMoveError(draggedEntry, destinationPath, destinationEntries);
		if (error) {
			setDropError(error);
			setDragMessage(error);
			return;
		}

		const source = draggedEntry;
		setMovingPath(source.path);
		setDropError('');
		try {
			const movedPath = await onMoveRequest(source, destinationPath);
			setExpanded((current) => {
				const next = new Set<string>();
				for (const path of current) {
					next.add(
						isWorkspacePathWithin(path, source.path)
							? rebaseWorkspacePath(path, source.path, movedPath)
							: path
					);
				}
				if (destinationPath) next.add(destinationPath);
				return next;
			});
			setDragMessage(
				`Moved ${source.name} to ${destinationPath ? destinationPath : 'the workspace root'}.`
			);
		} catch (error) {
			setDragMessage(error instanceof Error ? error.message : 'Unable to move the item.');
		} finally {
			setMovingPath(null);
			setDraggedEntry(null);
			setDropTargetPath(null);
			setDropError('');
		}
	}

	function dragOverRoot(event: DragEvent<HTMLElement>) {
		if (!draggedEntry || movingPath) return;
		if ((event.target as Element).closest('[data-workspace-entry]')) return;
		event.preventDefault();
		const error = workspaceMoveError(draggedEntry, '', workspaceFiles);
		event.dataTransfer.dropEffect = error ? 'none' : 'move';
		setDropTargetPath('');
		setDropError(error);
	}

	function dropOnRoot(event: DragEvent<HTMLElement>) {
		if ((event.target as Element).closest('[data-workspace-entry]')) return;
		void moveEntry(event, '', workspaceFiles);
	}

	return (
		<div
			className={cn(
				'flex h-full w-full flex-col bg-sidebar text-sidebar-foreground',
				dropTargetPath === '' && !dropError && 'ring-1 ring-inset ring-sidebar-ring',
				dropTargetPath === '' && dropError && 'ring-1 ring-inset ring-destructive'
			)}
			onDragOver={dragOverRoot}
			onDragLeave={(event) => dragLeaveTarget(event, '')}
			onDrop={dropOnRoot}
			onContextMenu={(event) => {
				showNativeContextMenu(
					event,
					[
						{ id: 'new-file', label: 'New File' },
						{ id: 'new-folder', label: 'New Folder' },
						{ type: 'separator' },
						{
							id: 'expand-all',
							label: 'Expand All',
							enabled: regularFiles.length > 0 || agentFiles.length > 0,
						},
						{
							id: 'collapse-all',
							label: 'Collapse All',
							enabled: expanded.size > 0 || agentExpanded,
						},
						{ type: 'separator' },
						{
							id: 'copy-workspace-path',
							label: 'Copy Workspace Path',
							enabled: Boolean(workspaceLocation),
						},
					],
					{
						'new-file': () => onCreateRequest('', 'file'),
						'new-folder': () => onCreateRequest('', 'directory'),
						'expand-all': () => {
							setExpanded(collectDirectoryPaths(regularFiles));
							setAgentExpanded(agentFiles.length > 0);
						},
						'collapse-all': () => {
							setExpanded(new Set());
							setAgentExpanded(false);
						},
						'copy-workspace-path': () => navigator.clipboard.writeText(workspaceLocation),
					}
				);
			}}
		>
			<header
				className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border/70 px-4"
				title={workspaceLocation || workspaceName}
			>
				<FolderOpen className="h-4 w-4 shrink-0 text-sidebar-muted" strokeWidth={1.8} />
				<h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em]">
					{workspaceName}
				</h1>
			</header>

			<nav
				className="min-h-0 flex-1 overflow-y-auto px-2 py-2 scrollbar-subtle"
				aria-label="Workspace files"
			>
				{!workspaceLoading && !workspaceError && agentFiles.length > 0 ? (
					<Collapsible open={agentExpanded} onOpenChange={setAgentExpanded} className="mb-0.5">
						<CollapsibleTrigger asChild>
							<Button
								data-workspace-entry
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 w-full justify-start gap-1.5 rounded-md px-2 text-[12px] font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-0"
								onContextMenu={(event) => {
									showNativeContextMenu(
										event,
										[
											{
												id: 'toggle-agent',
												label: agentExpanded ? 'Collapse Agent' : 'Expand Agent',
											},
										],
										{ 'toggle-agent': () => setAgentExpanded((current) => !current) }
									);
								}}
							>
								<ChevronRight
									className={cn(
										'h-3.5 w-3.5 shrink-0 transition-transform',
										agentExpanded && 'rotate-90'
									)}
									strokeWidth={1.8}
								/>
								<Bot className="h-3.5 w-3.5 shrink-0 text-sidebar-muted" strokeWidth={1.8} />
								<span className="min-w-0 flex-1 truncate text-left">Agent</span>
								<Badge
									variant="secondary"
									className="h-4 border-0 bg-sidebar-accent px-1.5 text-[10px] text-sidebar-foreground"
								>
									{agentFiles.length}
								</Badge>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<ul className="space-y-0.5">
								{agentFiles.map((entry) => (
									<WorkspaceTreeItem
										key={entry.path}
										depth={1}
										draggedPath={draggedEntry?.path ?? null}
										dropError={dropError}
										dropTargetPath={dropTargetPath}
										entry={entry}
										expanded={expanded}
										movingPath={movingPath}
										onCreateRequest={onCreateRequest}
										onDeleteRequest={onDeleteRequest}
										onDragEnd={endDrag}
										onDragLeave={dragLeaveTarget}
										onDragOver={dragOverEntry}
										onDragStart={startDrag}
										onDrop={(event, destination) => {
											if (destination.type === 'directory') {
												void moveEntry(event, destination.path, destination.children ?? []);
											}
										}}
										onToggle={toggleDirectory}
										onSelect={onWorkspaceSelect}
										selectedPath={selectedWorkspacePath}
									/>
								))}
							</ul>
						</CollapsibleContent>
					</Collapsible>
				) : null}
				<WorkspaceTree
					draggedPath={draggedEntry?.path ?? null}
					dropError={dropError}
					dropTargetPath={dropTargetPath}
					expanded={expanded}
					onCreateRequest={onCreateRequest}
					files={regularFiles}
					loading={workspaceLoading}
					movingPath={movingPath}
					error={workspaceError}
					onDeleteRequest={onDeleteRequest}
					onDragEnd={endDrag}
					onDragLeave={dragLeaveTarget}
					onDragOver={dragOverEntry}
					onDragStart={startDrag}
					onDrop={(event, destination) => {
						if (destination.type === 'directory') {
							void moveEntry(event, destination.path, destination.children ?? []);
						}
					}}
					onToggle={toggleDirectory}
					onSelect={onWorkspaceSelect}
					selectedPath={selectedWorkspacePath}
					showEmpty={agentFiles.length === 0}
				/>
				{draggedEntry || dragMessage ? (
					<p
						role="status"
						aria-live="polite"
						className={cn(
							'mx-1 mt-2 rounded-md border border-sidebar-border/70 bg-sidebar-accent px-2 py-1.5 text-[11px] leading-4 text-sidebar-muted',
							dropError && 'border-destructive text-sidebar-foreground'
						)}
					>
						{dropError || dragMessage}
					</p>
				) : null}
			</nav>
		</div>
	);
}
