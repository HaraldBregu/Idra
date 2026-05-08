import { startTransition, useDeferredValue, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
	CommandDialog,
	CommandSeparator,
} from '@/components/ui/Command';
import { APP_SEARCH_RESULT_KIND_LABELS } from '../search/constants';
import { useAppSearchResults } from '../search/use-app-search-results';
import type { AppSearchResultItem } from '../search/types';
import type { CommandModalProps } from '../registry/command-modal-registry';

export function AppSearchCommandModal({ open, onOpenChange }: CommandModalProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const navigate = useNavigate();
	const [query, setQuery] = useState('');
	const deferredQuery = useDeferredValue(query);
	const { sections, totalCount } = useAppSearchResults(deferredQuery);

	function handleSelect(item: AppSearchResultItem): void {
		onOpenChange(false);
		setQuery('');

		if (item.kind === 'document') {
			navigate({ to: '/settings/assistant' });
			return;
		}

		if (item.href) {
			router.history.push(item.href);
		}
	}

	function handleOpenChange(nextOpen: boolean): void {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			setQuery('');
		}
	}

	return (
		<CommandDialog
			open={open}
			onOpenChange={handleOpenChange}
			title={t('menu.search', 'Search')}
			description={t(
				'search.commandDescription',
				'Search routes, documents, and resources across the app.'
			)}
			className="sm:max-w-3xl"
			commandProps={{
				shouldFilter: false,
				value: deferredQuery,
			}}
		>
			<CommandInput
				value={query}
				onValueChange={(value) => {
					startTransition(() => {
						setQuery(value);
					});
				}}
				placeholder={t('menu.search', 'Search')}
			/>
			<div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
				<span>{t('search.commandHint', 'Search anything in the app')}</span>
				<span>
					{t('search.resultsSummary', {
						count: totalCount,
						query: deferredQuery,
						defaultValue:
							deferredQuery.trim().length > 0
								? totalCount === 1
									? '1 result for "{{query}}"'
									: '{{count}} results for "{{query}}"'
								: '{{count}} results',
					})}
				</span>
			</div>
			<CommandList className="max-h-[70vh]">
				<CommandEmpty className="px-6 py-12 text-left">
					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">
							{t('search.emptyTitle', 'No matches yet')}
						</p>
						<p className="text-sm text-muted-foreground">
							{deferredQuery.trim().length > 0
								? t('search.emptyDescription', {
										query: deferredQuery,
										defaultValue:
											'Nothing matched "{{query}}". Try a title, path, or section name.',
									})
								: t(
										'search.commandEmptyDescription',
										'Try a route name, document title, file name, or section.'
									)}
						</p>
					</div>
				</CommandEmpty>
				{sections.map((section, index) => (
					<div key={section.id}>
						<CommandGroup heading={section.title}>
							{section.items.map((item) => {
								const Icon = item.icon;

								return (
									<CommandItem
										key={item.id}
										value={`${item.title} ${item.description} ${item.meta}`}
										onSelect={() => {
											handleSelect(item);
										}}
										className="items-start gap-3 rounded-xl px-3 py-3"
									>
										<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
											<Icon className="size-4" />
										</div>
										<div className="min-w-0 flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<span className="truncate text-sm font-medium text-foreground">
													{item.title}
												</span>
												<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
													{t(`search.kind.${item.kind}`, APP_SEARCH_RESULT_KIND_LABELS[item.kind])}
												</span>
											</div>
											<p className="line-clamp-2 text-xs text-muted-foreground">
												{item.description}
											</p>
										</div>
										<CommandShortcut className="mt-0.5 max-w-32 truncate text-right tracking-[0.12em]">
											{item.meta}
										</CommandShortcut>
									</CommandItem>
								);
							})}
						</CommandGroup>
						{index < sections.length - 1 && <CommandSeparator />}
					</div>
				))}
			</CommandList>
		</CommandDialog>
	);
}
