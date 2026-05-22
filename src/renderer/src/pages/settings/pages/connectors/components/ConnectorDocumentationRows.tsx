import React from 'react';
import { BookOpen, ExternalLink, FileText, KeyRound, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { handleExternalLinkClick } from '@/lib/external-links';
import { cn } from '@/lib/utils';
import type { OPENAI_CONNECTOR_CATALOG } from '../../../../../../../shared/connector';

type ConnectorCatalogItem = (typeof OPENAI_CONNECTOR_CATALOG)[number];

export function ConnectorDocumentationRows({
	connector,
	className,
}: {
	readonly connector: ConnectorCatalogItem;
	readonly className?: string;
}): React.JSX.Element {
	return (
		<div className={cn('grid gap-3 px-3 py-2.5', className)}>
			<div className="flex min-w-0 items-start gap-2">
				<FileText className="mt-0.5 size-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
				<div className="min-w-0">
					<div className="text-[11px] font-medium leading-4 text-foreground">{connector.docsLabel}</div>
					<div className="break-all font-mono text-[11px] leading-4 text-muted-foreground">
						{connector.docsPath}
					</div>
				</div>
			</div>

			<div className="grid gap-1.5">
				<div className="flex items-center gap-1.5 text-[11px] font-medium leading-4 text-foreground">
					<KeyRound className="size-3 text-muted-foreground" strokeWidth={1.8} />
					Environment secrets
				</div>
				<div className="flex flex-wrap gap-1.5">
					{connector.environmentSecretNames.map((secret) => (
						<Badge key={secret} variant="outline" className="h-5 max-w-full px-1.5 font-mono text-[10px]">
							<span className="truncate">{secret}</span>
						</Badge>
					))}
				</div>
			</div>

			<div className="grid gap-1.5">
				<div className="flex items-center gap-1.5 text-[11px] font-medium leading-4 text-foreground">
					<BookOpen className="size-3 text-muted-foreground" strokeWidth={1.8} />
					Platform documentation
				</div>
				<div className="flex flex-wrap gap-1.5">
					{connector.platformDocumentationPages.map((page) => (
						<a
							key={page.url}
							href={page.url}
							target="_blank"
							rel="noreferrer"
							onClick={(event) => handleExternalLinkClick(event, page.url)}
							className="inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] text-foreground underline-offset-2 hover:bg-muted hover:underline"
						>
							<span className="truncate">{page.label}</span>
							<ExternalLink className="size-3 shrink-0" />
						</a>
					))}
				</div>
			</div>

			<div className="grid gap-1.5">
				<div className="flex items-center gap-1.5 text-[11px] font-medium leading-4 text-foreground">
					<Terminal className="size-3 text-muted-foreground" strokeWidth={1.8} />
					Example
				</div>
				<div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
					<Badge variant="secondary" className="h-5 max-w-full px-1.5 font-mono text-[10px]">
						<span className="truncate">{connector.example.tool}</span>
					</Badge>
					<span className="min-w-0 break-all font-mono">{JSON.stringify(connector.example.input)}</span>
				</div>
			</div>
		</div>
	);
}
