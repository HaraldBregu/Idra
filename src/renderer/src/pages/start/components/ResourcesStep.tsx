import React, { useEffect, useState } from 'react';
import { ChevronDown, HardDrive, Search } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SEARCH_ENGINES } from '@pages/settings/pages/search/catalog';
import type { SearchEngineId, SearchSettings } from '@shared/search_types';
import type { StorageConfig, StorageConfiguration } from '@shared/storage_types';

export function ResourcesStep(): React.JSX.Element {
	const [searchSettings, setSearchSettings] = useState<SearchSettings | null>(null);
	const [storageEntries, setStorageEntries] = useState<StorageConfig[]>([]);
	const [storageConfiguration, setStorageConfiguration] = useState<StorageConfiguration | null>(
		null
	);
	const [openSection, setOpenSection] = useState<'search' | 'storage' | null>(null);

	useEffect(() => {
		let cancelled = false;
		void Promise.all([
			window.search.getSettings(),
			window.storage.getStorages(),
			window.storage.getStorageConfiguration(),
		])
			.then(([search, storages, storage]) => {
				if (cancelled) return;
				setSearchSettings(search);
				setStorageEntries(storages);
				setStorageConfiguration(storage);
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="mt-8 grid gap-6">
			<section>
				<div className="mb-2">
					<h2 className="text-sm font-semibold text-foreground">Search engine</h2>
					<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
						Choose the web search engine.
					</p>
				</div>
				<Collapsible
					open={openSection === 'search'}
					onOpenChange={(open) => setOpenSection(open ? 'search' : null)}
					className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
				>
					<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
							<Search className="size-4" aria-hidden="true" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="truncate text-[13px] font-medium leading-4 text-foreground">
								{SEARCH_ENGINES.find((engine) => engine.id === searchSettings?.engineId)?.name ??
									'No search engine selected'}
							</div>
							<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
								Choose a connected search engine
							</p>
						</div>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
					</CollapsibleTrigger>
					<CollapsibleContent className="border-t border-border/60">
						<div className="px-3 py-3">
							<Select
								value={searchSettings?.engineId ?? null}
								disabled={!searchSettings}
								onValueChange={(value) => {
									if (!value) return;
									void window.search
										.selectEngine(value as SearchEngineId)
										.then(setSearchSettings)
										.catch(() => undefined);
								}}
							>
								<SelectTrigger className="w-full text-xs">
									<SelectValue placeholder="Connect a search provider first" />
								</SelectTrigger>
								<SelectContent>
									{SEARCH_ENGINES.map((engine) => (
										<SelectItem
											key={engine.id}
											value={engine.id}
											disabled={!searchSettings?.configured[engine.id]}
										>
											{engine.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</section>

			<section>
				<div className="mb-2">
					<h2 className="text-sm font-semibold text-foreground">Storage</h2>
					<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
						Choose storage for files and sync.
					</p>
				</div>
				<Collapsible
					open={openSection === 'storage'}
					onOpenChange={(open) => setOpenSection(open ? 'storage' : null)}
					className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
				>
					<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
							<HardDrive className="size-4" aria-hidden="true" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="truncate text-[13px] font-medium leading-4 text-foreground">
								{storageEntries.find((storage) => storage.id === storageConfiguration?.storageId)
									?.name ?? 'No storage selected'}
							</div>
							<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
								Choose connected storage
							</p>
						</div>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
					</CollapsibleTrigger>
					<CollapsibleContent className="border-t border-border/60">
						<div className="px-3 py-3">
							<Select
								value={storageConfiguration?.storageId ?? null}
								disabled={!storageConfiguration || storageEntries.length === 0}
								onValueChange={(value) => {
									if (!value || !storageConfiguration) return;
									const next = {
										...storageConfiguration,
										providerId: value,
										storageId: value,
									};
									void window.storage
										.saveStorageConfiguration(next)
										.then(setStorageConfiguration)
										.catch(() => undefined);
								}}
							>
								<SelectTrigger className="w-full text-xs">
									<SelectValue placeholder="Connect storage first" />
								</SelectTrigger>
								<SelectContent>
									{storageEntries.map((storage) => (
										<SelectItem key={storage.id} value={storage.id}>
											{storage.name || storage.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</section>
		</div>
	);
}
