import React from 'react';
import { ExternalLink, LoaderCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProviderAvatar } from '@/components/ui/provider-avatar';
import { cn } from '@/lib/utils';
import type { ProviderCatalogItem, ProviderSetupEntry } from '../types';

type ProviderCardProps = {
	readonly provider: ProviderCatalogItem;
	readonly entry: ProviderSetupEntry | undefined;
	readonly savingProviderId: string | null;
	readonly onUpdateEntry: (providerId: string, patch: Partial<ProviderSetupEntry>) => void;
	readonly onApiKeyChange: (providerId: string, apiKey: string) => void;
	readonly onSave: (providerId: string) => Promise<boolean>;
	readonly onOpenLink: (provider: ProviderCatalogItem) => void;
};

export function ProviderCard({
	provider,
	entry,
	savingProviderId,
	onUpdateEntry,
	onApiKeyChange,
	onSave,
	onOpenLink,
}: ProviderCardProps): React.JSX.Element {
	const connected = entry?.apiKeySaved ?? false;
	const editing = entry?.editing ?? false;
	const savingThisProvider = savingProviderId === provider.id || savingProviderId === 'all';
	const canSaveProvider = !!entry && !savingThisProvider && entry.apiKey.trim().length > 0;

	return (
		<Card
			className={cn(
				'rounded-lg border-border bg-card py-0 shadow-none',
				editing && 'border-ring ring-2 ring-ring/20',
				!provider.supported && 'opacity-60'
			)}
		>
			<CardContent className="p-0">
				<div className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5">
					<ProviderAvatar providerId={provider.id} name={provider.name} />

					<div className="min-w-0">
						<p className="truncate text-sm font-semibold leading-tight text-foreground">
							{provider.name}
						</p>
						<p className="mt-0.5 flex items-center gap-1 truncate text-xs leading-tight text-muted-foreground">
							{connected ? (
								<>
									<span
										className="inline-block size-1.5 shrink-0 rounded-full bg-emerald-500"
										aria-hidden="true"
									/>
									Connected
								</>
							) : (
								provider.capabilities
							)}
						</p>
					</div>

					<div className="flex shrink-0 items-center gap-1">
						{provider.supported ? (
							connected && !editing ? (
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									aria-label={`Edit ${provider.name} API key`}
									onClick={() => onUpdateEntry(provider.id, { editing: true, apiKey: '' })}
								>
									<Pencil className="size-3.5" />
								</Button>
							) : editing ? null : (
								<>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										className="text-muted-foreground hover:text-foreground"
										aria-label={`Open ${provider.name} API setup`}
										onClick={() => onOpenLink(provider)}
									>
										<ExternalLink className="size-3.5" />
									</Button>
									<Button
										type="button"
										variant="outline"
										size="xs"
										onClick={() => onUpdateEntry(provider.id, { editing: true })}
									>
										Connect
									</Button>
								</>
							)
						) : (
							<Button type="button" variant="outline" size="xs" disabled>
								Soon
							</Button>
						)}
					</div>
				</div>

				{provider.supported && editing && entry ? (
					<div className="grid gap-2 px-3 pb-3 pt-1">
						<Input
							aria-label={`${provider.name} API key`}
							autoComplete="off"
							autoFocus
							className="h-8 rounded-md border-input bg-card px-2.5 text-xs font-mono placeholder:font-sans placeholder:text-muted-foreground"
							disabled={savingThisProvider}
							onChange={(event) => onApiKeyChange(provider.id, event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' && canSaveProvider) {
									void onSave(provider.id);
								}
							}}
							placeholder="Paste your API key"
							spellCheck={false}
							type="password"
							value={entry.apiKey}
						/>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={savingThisProvider}
								onClick={() => onUpdateEntry(provider.id, { apiKey: '', editing: false })}
							>
								Cancel
							</Button>
							<Button
								type="button"
								size="sm"
								disabled={!canSaveProvider}
								onClick={() => void onSave(provider.id)}
							>
								{savingThisProvider ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
								Save
							</Button>
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
