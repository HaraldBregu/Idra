import { useEffect, useMemo, useState } from 'react';

import { AppSidebar, type ViewId } from '@/components/app-sidebar';
import { NoteEditor } from '@/components/note-editor';
import { NoteList } from '@/components/note-list';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { notesApi } from '@/lib/notes-api';
import { cn } from '@/lib/utils';
import type { Note, SortMode } from '@/lib/notes';

const titles: Record<ViewId, string> = {
	all: 'All notes',
	favorites: 'Favorites',
	search: 'Search',
	trash: 'Recently deleted',
};

export default function App() {
	const [notes, setNotes] = useState<Note[]>([]);
	const [activeView, setActiveView] = useState<ViewId | `folder:${string}`>('all');
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<SortMode>('updated');
	const [mobilePane, setMobilePane] = useState<'list' | 'editor'>('list');
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useEffect(() => {
		let active = true;

		notesApi.list().then((loaded) => {
			if (!active) return;
			setNotes(loaded);
			setSelectedId((current) => current ?? loaded.find((note) => !note.trashed)?.id ?? null);
		});

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
				event.preventDefault();
				void createNote();
			}
		};

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});

	const counts = useMemo(() => {
		const active = notes.filter((note) => !note.trashed);

		return {
			all: active.length,
			favorites: active.filter((note) => note.favorite).length,
			trash: notes.filter((note) => note.trashed).length,
			Work: active.filter((note) => note.folder === 'Work').length,
			Personal: active.filter((note) => note.folder === 'Personal').length,
			Ideas: active.filter((note) => note.folder === 'Ideas').length,
		};
	}, [notes]);

	const visibleNotes = useMemo(() => {
		let result = notes.filter((note) => (activeView === 'trash' ? note.trashed : !note.trashed));

		if (activeView === 'favorites') result = result.filter((note) => note.favorite);
		if (activeView.startsWith('folder:')) {
			result = result.filter((note) => note.folder === activeView.slice('folder:'.length));
		}

		const query = search.trim().toLowerCase();
		if (query) {
			result = result.filter((note) =>
				[note.title, note.content, note.folder, ...note.tags].some((value) => value.toLowerCase().includes(query)),
			);
		}

		return [...result].sort((a, b) => {
			if (sort === 'title') return a.title.localeCompare(b.title);
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});
	}, [activeView, notes, search, sort]);

	const selectedNote = notes.find((note) => note.id === selectedId) ?? null;
	const title = activeView.startsWith('folder:') ? activeView.slice('folder:'.length) : titles[activeView];

	function selectView(view: ViewId | `folder:${string}`) {
		setActiveView(view);
		setSidebarOpen(false);
		if (view === 'search') setSearch('');

		const next = notes.find((note) => (view === 'trash' ? note.trashed : !note.trashed));
		if (next) setSelectedId(next.id);
		setMobilePane('list');
	}

	async function createNote() {
		const currentFolder = activeView.startsWith('folder:') ? activeView.slice('folder:'.length) : 'Ideas';
		const note = await notesApi.create({
			title: 'Untitled note',
			content: '',
			folder: currentFolder,
			tags: [],
			favorite: false,
			trashed: false,
		});

		setNotes((current) => [note, ...current]);
		setSelectedId(note.id);
		setActiveView(currentFolder === 'Ideas' ? 'all' : `folder:${currentFolder}`);
		setSearch('');
		setSidebarOpen(false);
		setMobilePane('editor');
	}

	function updateSelected(patch: Partial<Omit<Note, 'id' | 'updatedAt'>>) {
		if (!selectedId) return;

		setNotes((current) =>
			current.map((note) => (note.id === selectedId ? { ...note, ...patch, updatedAt: Date.now() } : note)),
		);
		void notesApi.update(selectedId, patch);
	}

	function deleteSelected() {
		if (!selectedNote) return;
		const { id } = selectedNote;

		if (selectedNote.trashed) {
			void notesApi.delete(id);
			setNotes((current) => current.filter((note) => note.id !== id));
		} else {
			void notesApi.update(id, { trashed: true });
			setNotes((current) =>
				current.map((note) => (note.id === id ? { ...note, trashed: true, updatedAt: Date.now() } : note)),
			);
		}

		const next = visibleNotes.find((note) => note.id !== id);
		setSelectedId(next?.id ?? null);
		setMobilePane('list');
	}

	function restoreSelected() {
		if (!selectedNote) return;
		const { id } = selectedNote;

		void notesApi.update(id, { trashed: false });
		setNotes((current) =>
			current.map((note) => (note.id === id ? { ...note, trashed: false, updatedAt: Date.now() } : note)),
		);
		setActiveView('all');
	}

	const sidebar = (
		<AppSidebar activeView={activeView} counts={counts} onCreate={createNote} onViewChange={selectView} />
	);

	return (
		<TooltipProvider delayDuration={400}>
			<div className="flex h-dvh min-h-[520px] overflow-hidden bg-background text-foreground">
				<aside className="hidden w-[176px] shrink-0 border-r border-sidebar-border lg:block">{sidebar}</aside>

				<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
					<SheetContent
						side="left"
						className="w-[286px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[286px] [&>button]:text-sidebar-foreground"
					>
						<SheetTitle className="sr-only">Notes navigation</SheetTitle>
						<SheetDescription className="sr-only">Choose a notebook or create a new note.</SheetDescription>
						{sidebar}
					</SheetContent>
				</Sheet>

				<main className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 md:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
					<div className={cn('relative h-full min-h-0 min-w-0', mobilePane === 'editor' && 'hidden md:block')}>
						<NoteList
							activeView={activeView}
							notes={visibleNotes}
							onCreate={createNote}
							onOpenMenu={() => setSidebarOpen(true)}
							onSelect={(id) => {
								setSelectedId(id);
								setMobilePane('editor');
							}}
							search={search}
							selectedId={selectedId}
							setSearch={setSearch}
							setSort={setSort}
							sort={sort}
							title={title}
						/>
					</div>

					<div className={cn('h-full min-h-0 min-w-0', mobilePane === 'list' && 'hidden md:block')}>
						<NoteEditor
							note={selectedNote}
							onBack={() => setMobilePane('list')}
							onCreate={createNote}
							onDelete={deleteSelected}
							onRestore={restoreSelected}
							onToggleFavorite={() => updateSelected({ favorite: !selectedNote?.favorite })}
							onUpdate={updateSelected}
						/>
					</div>
				</main>
			</div>
		</TooltipProvider>
	);
}
