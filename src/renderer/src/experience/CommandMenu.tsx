import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
	AppWindow,
	Bot,
	BotMessageSquare,
	CalendarClock,
	Home,
	Info,
	Plug,
	Search,
	Server,
	Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
	readonly id: string;
	readonly label: string;
	readonly group: string;
	readonly icon: React.ElementType;
	readonly path: string;
	readonly keywords?: string;
}

const COMMAND_ITEMS: readonly CommandItem[] = [
	{ id: 'home', label: 'Home', group: 'Navigation', icon: Home, path: '/home', keywords: 'chat agent ai' },
	{ id: 'settings-general', label: 'General', group: 'Settings', icon: Info, path: '/settings/general', keywords: 'info app version theme language translucency appearance' },
	{ id: 'settings-channels', label: 'Channels', group: 'Settings', icon: BotMessageSquare, path: '/settings/channels', keywords: 'telegram discord slack whatsapp teams matrix signal bot' },
	{ id: 'settings-connectors', label: 'Connectors', group: 'Settings', icon: Plug, path: '/settings/connectors', keywords: 'mcp tools integration' },
	{ id: 'settings-skills', label: 'Skills', group: 'Settings', icon: Sparkles, path: '/settings/skills', keywords: 'plugins capabilities' },
	{ id: 'settings-agents', label: 'Agents', group: 'Settings', icon: Bot, path: '/settings/agents', keywords: 'friday main agent default' },
	{ id: 'settings-providers', label: 'Providers', group: 'Settings', icon: Server, path: '/settings/providers', keywords: 'api key openai anthropic model' },
	{ id: 'settings-cron', label: 'Cron', group: 'Settings', icon: CalendarClock, path: '/settings/cron', keywords: 'schedule jobs tasks recurring' },
	{ id: 'settings-apps', label: 'Apps', group: 'Settings', icon: AppWindow, path: '/settings/apps', keywords: 'installed packages' },
] as const;

function filterItems(query: string): CommandItem[] {
	if (!query.trim()) return [...COMMAND_ITEMS];
	const q = query.toLowerCase();
	return COMMAND_ITEMS.filter(
		(item) =>
			item.label.toLowerCase().includes(q) ||
			item.group.toLowerCase().includes(q) ||
			(item.keywords ?? '').includes(q)
	);
}

function groupItems(items: CommandItem[]): [string, CommandItem[]][] {
	const map = new Map<string, CommandItem[]>();
	for (const item of items) {
		if (!map.has(item.group)) map.set(item.group, []);
		map.get(item.group)!.push(item);
	}
	return [...map.entries()];
}

export function CommandMenu(): React.JSX.Element {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const prefersReducedMotion = useReducedMotion();

	const filtered = filterItems(query);
	const groups = groupItems(filtered);

	const closeMenu = useCallback(() => setOpen(false), []);

	const execute = useCallback(
		(item: CommandItem) => {
			navigate(item.path);
			closeMenu();
		},
		[navigate, closeMenu]
	);

	// ⌘K global toggle
	useEffect(() => {
		const handler = (e: KeyboardEvent): void => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				setOpen((prev) => {
					if (!prev) {
						setQuery('');
						setActiveIndex(0);
					}
					return !prev;
				});
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, []);

	// Focus input on open
	useEffect(() => {
		if (!open) return;
		const id = setTimeout(() => inputRef.current?.focus(), 16);
		return () => clearTimeout(id);
	}, [open]);

	// Reset active index when filtered list changes
	useEffect(() => {
		setActiveIndex(0);
	}, [query]);

	const handleKeyDown = (e: React.KeyboardEvent): void => {
		switch (e.key) {
			case 'Escape':
				closeMenu();
				break;
			case 'ArrowDown':
				e.preventDefault();
				setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setActiveIndex((i) => Math.max(i - 1, 0));
				break;
			case 'Enter': {
				e.preventDefault();
				const item = filtered[activeIndex];
				if (item) execute(item);
				break;
			}
		}
	};

	const motionDuration = prefersReducedMotion ? 0 : 0.14;

	const portal = (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop */}
					<motion.div
						key="cmd-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: motionDuration }}
						className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
						onClick={closeMenu}
						aria-hidden="true"
					/>

					{/* Panel */}
					<motion.div
						key="cmd-panel"
						role="dialog"
						aria-label="Command menu"
						aria-modal="true"
						initial={{ opacity: 0, scale: 0.96, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: -6 }}
						transition={{ duration: motionDuration, ease: [0, 0, 0.2, 1] }}
						className="fixed left-1/2 top-[22%] z-50 w-full max-w-[440px] -translate-x-1/2 overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-2xl shadow-black/25 backdrop-blur-xl"
						onKeyDown={handleKeyDown}
					>
						{/* Search bar */}
						<div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
							<Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search…"
								className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
								aria-label="Search commands"
								role="combobox"
								aria-expanded="true"
								aria-autocomplete="list"
								aria-controls="cmd-listbox"
								aria-activedescendant={filtered[activeIndex] ? `cmd-item-${filtered[activeIndex].id}` : undefined}
							/>
							<kbd className="hidden shrink-0 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
								ESC
							</kbd>
						</div>

						{/* Results */}
						<div
							id="cmd-listbox"
							role="listbox"
							aria-label="Commands"
							className="no-scrollbar max-h-[280px] overflow-y-auto py-1.5"
						>
							{filtered.length === 0 ? (
								<p className="px-4 py-8 text-center text-sm text-muted-foreground">
									No results for &ldquo;{query}&rdquo;
								</p>
							) : (
								groups.map(([group, groupItems]) => (
									<div key={group}>
										<div
											className="px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70"
											aria-hidden="true"
										>
											{group}
										</div>
										{groupItems.map((item) => {
											const idx = filtered.indexOf(item);
											const isActive = idx === activeIndex;
											const Icon = item.icon;

											return (
												<button
													key={item.id}
													id={`cmd-item-${item.id}`}
													type="button"
													role="option"
													aria-selected={isActive}
													onClick={() => execute(item)}
													onMouseEnter={() => setActiveIndex(idx)}
													className={cn(
														'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors focus-visible:outline-none',
														isActive
															? 'bg-accent text-accent-foreground'
															: 'text-foreground hover:bg-accent/60 hover:text-accent-foreground'
													)}
												>
													<span
														className={cn(
															'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
															isActive ? 'bg-accent-foreground/10' : 'bg-muted/60'
														)}
													>
														<Icon className="size-3.5" aria-hidden="true" />
													</span>
													<span className="flex-1 truncate">{item.label}</span>
												</button>
											);
										})}
									</div>
								))
							)}
						</div>

						{/* Footer hint */}
						<div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground/60">
							<span className="flex items-center gap-2">
								<span className="flex items-center gap-0.5">
									<kbd className="rounded border border-border/60 bg-muted/40 px-1 py-0.5 font-mono">↑</kbd>
									<kbd className="rounded border border-border/60 bg-muted/40 px-1 py-0.5 font-mono">↓</kbd>
									<span className="ml-1">navigate</span>
								</span>
								<span className="flex items-center gap-0.5">
									<kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono">↵</kbd>
									<span className="ml-1">open</span>
								</span>
							</span>
							<span>⌘K to toggle</span>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);

	return createPortal(portal, document.body) as React.JSX.Element;
}
