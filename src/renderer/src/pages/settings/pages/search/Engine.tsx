import React from 'react';
import { Check, ExternalLink, LoaderCircle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { openExternalUrl } from '@/lib/external-links';
import { cn } from '@/lib/utils';
import type { SearchEngineDefinition } from './catalog';

interface EngineProps {
	readonly engine: SearchEngineDefinition;
	readonly apiKey: string;
	readonly active: boolean;
	readonly configured: boolean;
	readonly editing: boolean;
	readonly saving: boolean;
	readonly busy: boolean;
	readonly onApiKeyChange: (value: string) => void;
	readonly onCancel: () => void;
	readonly onEdit: () => void;
	readonly onSave: () => void;
	readonly onSelect: () => void;
}

export function Engine({
	engine,
	apiKey,
	active,
	configured,
	editing,
	saving,
	busy,
	onApiKeyChange,
	onCancel,
	onEdit,
	onSave,
	onSelect,
}: EngineProps): React.JSX.Element {
	const { t } = useTranslation();
	const canSave = apiKey.trim().length > 0 && !saving;

	return (
		<Card
			className={cn(
				'rounded-lg border-border bg-card py-0 shadow-none',
				editing && 'border-ring ring-2 ring-ring/20'
			)}
		>
			<CardContent className="p-0">
				<div className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5">
					<ProviderAvatar providerId={engine.id} name={engine.name} />
					<div className="min-w-0">
						<div className="flex min-w-0 items-center gap-1.5">
							<h2 className="truncate text-sm font-semibold leading-tight text-foreground">
								{engine.name}
							</h2>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								className="size-5 text-muted-foreground hover:text-foreground"
								aria-label={t('settings.searchEngine.openSetup', { name: engine.name })}
								onClick={() => openExternalUrl(engine.configurationUrl)}
							>
								<ExternalLink className="size-3" />
							</Button>
						</div>
						<p className="truncate text-xs leading-tight text-muted-foreground">
							{t(engine.descriptionKey)}
						</p>
					</div>
					<div className="flex shrink-0 items-center justify-end gap-1.5">
						{active ? (
							<Badge variant="secondary" className="gap-1 text-[10px]">
								<Check className="size-3" />
								{t('settings.searchEngine.active')}
							</Badge>
						) : configured ? (
							<Button
								type="button"
								variant="outline"
								size="xs"
								disabled={busy}
								onClick={onSelect}
							>
								{saving ? <LoaderCircle className="size-3 animate-spin" /> : null}
								{t('settings.searchEngine.use')}
							</Button>
						) : !editing ? (
							<Button type="button" variant="outline" size="xs" onClick={onEdit}>
								{t('settings.searchEngine.connect')}
							</Button>
						) : null}
						{configured && !editing ? (
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label={t('settings.searchEngine.editKey', { name: engine.name })}
								onClick={onEdit}
							>
								<Pencil className="size-3.5" />
							</Button>
						) : null}
					</div>
				</div>

				{editing ? (
					<div className="flex items-center gap-2 px-3 pb-3">
						<Input
							aria-label={t('settings.searchEngine.apiKeyLabel', { name: engine.name })}
							autoComplete="off"
							className="h-8 flex-1 text-xs"
							disabled={saving}
							onChange={(event) => onApiKeyChange(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' && canSave) onSave();
							}}
							placeholder={t('settings.searchEngine.apiKeyPlaceholder')}
							spellCheck={false}
							type="password"
							value={apiKey}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={saving}
							onClick={onCancel}
						>
							{t('common.cancel')}
						</Button>
						<Button type="button" size="sm" disabled={!canSave} onClick={onSave}>
							{saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
							{t('common.save')}
						</Button>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
