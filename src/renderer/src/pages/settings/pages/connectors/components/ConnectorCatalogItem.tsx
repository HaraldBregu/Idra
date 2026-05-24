import { ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { handleExternalLinkClick } from '@/lib/external-links';
import { SettingsNotice } from '../../../components';
import { ConnectorDocumentationRows } from './ConnectorDocumentationRows';
import { ConnectorIcon } from './ConnectorIcon';
import type { ConnectorCatalog } from '../hooks/useConnectors';

export function ConnectorCatalogItem({
	item,
	onConfigure,
	alreadyConfigured,
}: {
	readonly item: ConnectorCatalog[number];
	readonly onConfigure: () => void;
	readonly alreadyConfigured: boolean;
}) {
	const googleOAuth = 'authKind' in item && item.authKind === 'google_oauth';

	return (
		<Collapsible className="rounded-lg border border-border/70 bg-card">
			<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
				<ConnectorIcon directConnectorId={item.directConnectorId} name={item.name} />
				<span className="min-w-0 flex-1">
					<span className="block truncate text-[13px] font-medium">{item.name}</span>
					<span className="block truncate text-[11px] text-muted-foreground">
						{googleOAuth ? 'Google OAuth' : 'Manual OAuth access token'}
					</span>
				</span>
				{alreadyConfigured && (
					<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
						Configured
					</Badge>
				)}
				<Button
					type="button"
					size="xs"
					variant={alreadyConfigured ? 'outline' : 'default'}
					onClick={(event) => {
						event.stopPropagation();
						onConfigure();
					}}
				>
					{alreadyConfigured ? 'Open' : 'Configure'}
				</Button>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent className="grid gap-2 border-t border-border/60 px-3 py-2.5">
				{item.scopes.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{item.scopes.map((scope) => (
							<Badge key={scope} variant="outline" className="h-4 px-1.5 text-[10px]">
								{scope}
							</Badge>
						))}
					</div>
				)}
				{item.setupInstructions.length > 0 && (
					<div>
						<div className="mb-1 flex flex-wrap items-center justify-between gap-2">
							<p className="text-[11px] font-medium text-foreground">Setup</p>
							{item.setupUrl && (
								<a
									href={item.setupUrl}
									target="_blank"
									rel="noreferrer"
									onClick={(e) => handleExternalLinkClick(e, item.setupUrl)}
									className="inline-flex items-center gap-1 text-[11px] text-foreground underline-offset-2 hover:underline"
								>
									Open setup
									<ExternalLink className="size-3" />
								</a>
							)}
						</div>
						<ol className="grid list-decimal gap-1 pl-4 text-[11px] leading-4 text-muted-foreground">
							{item.setupInstructions.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
					</div>
				)}
				{googleOAuth ? (
					<SettingsNotice variant="default">
						Google OAuth uses <span className="font-mono">GOOGLE_OAUTH_CLIENT_ID</span> and{' '}
						<span className="font-mono">GOOGLE_OAUTH_CLIENT_SECRET</span> from the app environment.
					</SettingsNotice>
				) : (
					<SettingsNotice variant="default">
						Manual OAuth connectors store an access token for catalog testing. Local tool execution
						is added only when a runtime strategy exists.
					</SettingsNotice>
				)}
				{item.tools.length > 0 && (
					<div>
						<p className="mb-1 text-[11px] font-medium text-foreground">Tools</p>
						<div className="flex flex-wrap gap-1">
							{item.tools.map((tool) => (
								<span
									key={tool}
									className="rounded-md border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
								>
									{tool}
								</span>
							))}
						</div>
					</div>
				)}
				<ConnectorDocumentationRows connector={item} />
			</CollapsibleContent>
		</Collapsible>
	);
}
