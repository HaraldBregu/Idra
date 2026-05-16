import React, { useMemo, useState } from 'react';
import {
	ArrowLeft,
	Bell,
	ChevronRight,
	Palette,
	Search,
	Settings,
	Shield,
	UserRound,
	type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

type Control =
	| { readonly kind: 'switch'; readonly key: string; readonly defaultChecked: boolean }
	| { readonly kind: 'value'; readonly value: string }
	| { readonly kind: 'button'; readonly label: string };

interface SettingRow {
	readonly id: string;
	readonly label: string;
	readonly detail: string;
	readonly control: Control;
}

interface SettingsPage {
	readonly id: string;
	readonly label: string;
	readonly detail: string;
	readonly rows: readonly SettingRow[];
}

interface SettingsSection {
	readonly id: string;
	readonly label: string;
	readonly detail: string;
	readonly icon: LucideIcon;
	readonly pages: readonly SettingsPage[];
}

type SearchResult =
	| {
			readonly kind: 'page';
			readonly section: SettingsSection;
			readonly page: SettingsPage;
	  }
	| {
			readonly kind: 'setting';
			readonly section: SettingsSection;
			readonly page: SettingsPage;
			readonly row: SettingRow;
	  };

const SETTINGS_SECTIONS: readonly SettingsSection[] = [
	{
		id: 'account',
		label: 'Account',
		detail: 'Profile and plan',
		icon: UserRound,
		pages: [
			{
				id: 'profile',
				label: 'Profile',
				detail: 'Name and email',
				rows: [
					{
						id: 'display-name',
						label: 'Display name',
						detail: 'Shown in local activity',
						control: { kind: 'value', value: 'Harald' },
					},
					{
						id: 'email',
						label: 'Email address',
						detail: 'Primary contact',
						control: { kind: 'button', label: 'Edit' },
					},
				],
			},
			{
				id: 'plan',
				label: 'Plan',
				detail: 'Billing summary',
				rows: [
					{
						id: 'current-plan',
						label: 'Current plan',
						detail: 'Workspace access',
						control: { kind: 'value', value: 'Pro' },
					},
					{
						id: 'billing',
						label: 'Billing',
						detail: 'Invoices and seats',
						control: { kind: 'button', label: 'Manage' },
					},
				],
			},
		],
	},
	{
		id: 'appearance',
		label: 'Appearance',
		detail: 'Theme and window',
		icon: Palette,
		pages: [
			{
				id: 'theme',
				label: 'Theme',
				detail: 'Color mode',
				rows: [
					{
						id: 'mode',
						label: 'Mode',
						detail: 'Follow system preference',
						control: { kind: 'value', value: 'System' },
					},
					{
						id: 'accent',
						label: 'Accent',
						detail: 'Interface tint',
						control: { kind: 'value', value: 'Zinc' },
					},
				],
			},
			{
				id: 'window',
				label: 'Window',
				detail: 'Desktop behavior',
				rows: [
					{
						id: 'compact-sidebar',
						label: 'Compact sidebar',
						detail: 'Use tighter navigation',
						control: { kind: 'switch', key: 'compactSidebar', defaultChecked: true },
					},
					{
						id: 'reduce-motion',
						label: 'Reduce motion',
						detail: 'Limit panel animation',
						control: { kind: 'switch', key: 'reduceMotion', defaultChecked: false },
					},
				],
			},
		],
	},
	{
		id: 'notifications',
		label: 'Notifications',
		detail: 'Alerts and email',
		icon: Bell,
		pages: [
			{
				id: 'alerts',
				label: 'Alerts',
				detail: 'Desktop notices',
				rows: [
					{
						id: 'desktop-alerts',
						label: 'Desktop alerts',
						detail: 'Show local banners',
						control: { kind: 'switch', key: 'desktopAlerts', defaultChecked: true },
					},
					{
						id: 'sound',
						label: 'Sound',
						detail: 'Notification tone',
						control: { kind: 'value', value: 'Soft' },
					},
				],
			},
			{
				id: 'email',
				label: 'Email',
				detail: 'Digest options',
				rows: [
					{
						id: 'weekly-digest',
						label: 'Weekly digest',
						detail: 'Summary every Monday',
						control: { kind: 'switch', key: 'weeklyDigest', defaultChecked: false },
					},
					{
						id: 'product-updates',
						label: 'Product updates',
						detail: 'Low frequency notes',
						control: { kind: 'switch', key: 'productUpdates', defaultChecked: true },
					},
				],
			},
		],
	},
	{
		id: 'privacy',
		label: 'Privacy',
		detail: 'Security and data',
		icon: Shield,
		pages: [
			{
				id: 'security',
				label: 'Security',
				detail: 'Local protection',
				rows: [
					{
						id: 'app-lock',
						label: 'App lock',
						detail: 'Require unlock on open',
						control: { kind: 'switch', key: 'appLock', defaultChecked: false },
					},
					{
						id: 'data-access',
						label: 'Data access',
						detail: 'Storage location',
						control: { kind: 'value', value: 'Local' },
					},
				],
			},
			{
				id: 'data',
				label: 'Data',
				detail: 'Usage controls',
				rows: [
					{
						id: 'analytics',
						label: 'Analytics',
						detail: 'Anonymous diagnostics',
						control: { kind: 'switch', key: 'analytics', defaultChecked: false },
					},
					{
						id: 'clear-cache',
						label: 'Cache',
						detail: 'Temporary files',
						control: { kind: 'button', label: 'Clear' },
					},
				],
			},
		],
	},
] as const;

const initialSwitches = SETTINGS_SECTIONS.flatMap((section) => section.pages)
	.flatMap((page) => page.rows)
	.reduce<Record<string, boolean>>((state, row) => {
		if (row.control.kind === 'switch') {
			state[row.control.key] = row.control.defaultChecked;
		}
		return state;
	}, {});

function matches(value: string, query: string): boolean {
	return value.toLowerCase().includes(query.toLowerCase());
}

function findSection(sectionId: string | null): SettingsSection | undefined {
	return SETTINGS_SECTIONS.find((section) => section.id === sectionId);
}

function findPage(section: SettingsSection | undefined, pageId: string | null): SettingsPage | undefined {
	return section?.pages.find((page) => page.id === pageId);
}

function pageKey(sectionId: string | null, pageId: string | null): string {
	if (pageId) return `page-${sectionId}-${pageId}`;
	if (sectionId) return `section-${sectionId}`;
	return 'home';
}

function WindowDots(): React.JSX.Element {
	return (
		<div className="flex items-center gap-1.5">
			<span className="size-2.5 rounded-full bg-zinc-300" />
			<span className="size-2.5 rounded-full bg-zinc-300" />
			<span className="size-2.5 rounded-full bg-zinc-300" />
		</div>
	);
}

function ControlView({
	control,
	switches,
	setSwitches,
}: {
	readonly control: Control;
	readonly switches: Record<string, boolean>;
	readonly setSwitches: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}): React.JSX.Element {
	if (control.kind === 'switch') {
		return (
			<Switch
				size="sm"
				checked={switches[control.key] ?? false}
				onCheckedChange={(checked) =>
					setSwitches((current) => ({ ...current, [control.key]: checked }))
				}
				aria-label={control.key}
			/>
		);
	}

	if (control.kind === 'button') {
		return (
			<Button type="button" variant="outline" size="xs" className="h-6 rounded-md px-2 text-[11px]">
				{control.label}
			</Button>
		);
	}

	return (
		<span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
			{control.value}
		</span>
	);
}

function RowContent({
	label,
	detail,
	children,
}: {
	readonly label: string;
	readonly detail: string;
	readonly children: React.ReactNode;
}): React.JSX.Element {
	return (
		<>
			<span className="min-w-0">
				<span className="block truncate text-xs font-medium text-zinc-900">{label}</span>
				<span className="mt-0.5 block truncate text-[11px] leading-4 text-zinc-500">{detail}</span>
			</span>
			{children}
		</>
	);
}

export function Layout(): React.JSX.Element {
	const [sectionId, setSectionId] = useState<string | null>(null);
	const [pageId, setPageId] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [switches, setSwitches] = useState<Record<string, boolean>>(initialSwitches);

	const currentSection = findSection(sectionId);
	const currentPage = findPage(currentSection, pageId);
	const showingSearch = search.trim().length > 0;

	const searchResults = useMemo<readonly SearchResult[]>(() => {
		const query = search.trim();
		if (!query) return [];

		const results: SearchResult[] = [];
		for (const section of SETTINGS_SECTIONS) {
			for (const page of section.pages) {
				if (matches(page.label, query) || matches(page.detail, query) || matches(section.label, query)) {
					results.push({ kind: 'page', section, page });
				}

				for (const row of page.rows) {
					if (matches(row.label, query) || matches(row.detail, query)) {
						results.push({ kind: 'setting', section, page, row });
					}
				}
			}
		}
		return results.slice(0, 7);
	}, [search]);

	const goHome = (): void => {
		setSectionId(null);
		setPageId(null);
	};

	const goBack = (): void => {
		if (pageId) {
			setPageId(null);
			return;
		}
		goHome();
	};

	const openSection = (nextSectionId: string): void => {
		setSectionId(nextSectionId);
		setPageId(null);
	};

	const openPage = (nextSectionId: string, nextPageId: string): void => {
		setSectionId(nextSectionId);
		setPageId(nextPageId);
		setSearch('');
	};

	const title = currentPage?.label ?? currentSection?.label ?? 'Home';

	return (
		<div className="flex min-h-full items-center justify-center bg-white p-4 text-zinc-950">
			<Card
				size="sm"
				className="h-[min(700px,calc(100vh-32px))] w-[min(500px,calc(100vw-32px))] gap-0 rounded-2xl border border-zinc-200 bg-white py-0 shadow-[0_24px_70px_rgba(24,24,27,0.14)] ring-0"
			>
				<CardContent className="flex h-full flex-col p-0">
					<header className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-zinc-200 px-3">
						<WindowDots />
						<div className="text-[13px] font-semibold text-zinc-800">Settings</div>
						<div className="flex justify-end">
							<div className="flex size-6 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
								<Settings className="size-3.5" strokeWidth={1.8} />
							</div>
						</div>
					</header>

					<nav className="grid h-11 shrink-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-2 border-b border-zinc-200 px-3">
						{sectionId ? (
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								onClick={goBack}
								aria-label="Back"
								className="rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
							>
								<ArrowLeft className="size-3.5" strokeWidth={1.9} />
							</Button>
						) : (
							<div />
						)}
						<div className="grid min-w-0 grid-cols-[minmax(70px,auto)_minmax(0,1fr)] items-center gap-2">
							<div className="truncate text-xs font-semibold text-zinc-800">{title}</div>
							<div className="relative min-w-0">
								<Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-zinc-400" />
								<Input
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder="Jump to..."
									aria-label="Jump to setting"
									className="h-7 rounded-md border-zinc-200 bg-zinc-50 pl-7 pr-2 text-xs text-zinc-900 shadow-none ring-offset-0 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-300 focus-visible:ring-offset-0 md:text-xs"
								/>
							</div>
						</div>
					</nav>

					<main className="min-h-0 flex-1 overflow-hidden bg-zinc-50/60">
						<AnimatePresence mode="wait" initial={false}>
							{showingSearch ? (
								<motion.div
									key="search"
									initial={{ opacity: 0, x: 14 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -14 }}
									transition={{ duration: 0.16, ease: 'easeOut' }}
									className="h-full overflow-y-auto p-3"
								>
									<div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
										Jump results
									</div>
									<div className="space-y-1.5">
										{searchResults.length > 0 ? (
											searchResults.map((result) => {
												const label =
													result.kind === 'page' ? result.page.label : result.row.label;
												const detail =
													result.kind === 'page'
														? `${result.section.label} / ${result.page.detail}`
														: `${result.section.label} / ${result.page.label}`;

												return (
													<motion.div
														key={`${result.kind}-${result.section.id}-${result.page.id}-${
															result.kind === 'setting' ? result.row.id : result.page.id
														}`}
														layout
														initial={{ opacity: 0, y: 4 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: -4 }}
													>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => openPage(result.section.id, result.page.id)}
															className="h-auto w-full justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left hover:bg-zinc-100"
														>
															<RowContent label={label} detail={detail}>
																<span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
																	{result.kind === 'page' ? 'Page' : 'Setting'}
																</span>
															</RowContent>
														</Button>
													</motion.div>
												);
											})
										) : (
											<div className="rounded-lg border border-zinc-200 bg-white px-3 py-6 text-center text-xs text-zinc-500">
												No matches
											</div>
										)}
									</div>
								</motion.div>
							) : (
								<motion.div
									key={pageKey(sectionId, pageId)}
									initial={{ opacity: 0, x: pageId || sectionId ? 18 : -18 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: pageId || sectionId ? -18 : 18 }}
									transition={{ duration: 0.18, ease: 'easeOut' }}
									className="h-full overflow-y-auto p-3"
								>
									{currentPage ? (
										<div className="space-y-2">
											<div className="px-1">
												<div className="text-sm font-semibold text-zinc-900">
													{currentPage.label}
												</div>
												<div className="mt-0.5 text-[11px] text-zinc-500">
													{currentPage.detail}
												</div>
											</div>
											<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
												{currentPage.rows.map((row) => (
													<div
														key={row.id}
														className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-100 px-3 py-2 last:border-b-0"
													>
														<RowContent label={row.label} detail={row.detail}>
															<ControlView
																control={row.control}
																switches={switches}
																setSwitches={setSwitches}
															/>
														</RowContent>
													</div>
												))}
											</div>
										</div>
									) : currentSection ? (
										<div className="space-y-2">
											<div className="px-1">
												<div className="text-sm font-semibold text-zinc-900">
													{currentSection.label}
												</div>
												<div className="mt-0.5 text-[11px] text-zinc-500">
													{currentSection.detail}
												</div>
											</div>
											<div className="space-y-1.5">
												{currentSection.pages.map((page) => (
													<Button
														key={page.id}
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => openPage(currentSection.id, page.id)}
														className="h-auto w-full justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left hover:bg-zinc-100"
													>
														<RowContent label={page.label} detail={page.detail}>
															<ChevronRight className="size-3.5 text-zinc-400" />
														</RowContent>
													</Button>
												))}
											</div>
										</div>
									) : (
										<div className="space-y-1.5">
											{SETTINGS_SECTIONS.map((section) => {
												const Icon = section.icon;
												return (
													<Button
														key={section.id}
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => openSection(section.id)}
														className="h-auto w-full justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left hover:bg-zinc-100"
													>
														<span className="flex min-w-0 items-center gap-2.5">
															<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
																<Icon className="size-3.5" strokeWidth={1.8} />
															</span>
															<span className="min-w-0">
																<span className="block truncate text-xs font-medium text-zinc-900">
																	{section.label}
																</span>
																<span className="mt-0.5 block truncate text-[11px] leading-4 text-zinc-500">
																	{section.detail}
																</span>
															</span>
														</span>
														<ChevronRight className="size-3.5 text-zinc-400" />
													</Button>
												);
											})}
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</main>
				</CardContent>
			</Card>
		</div>
	);
}

export default Layout;
