import React, { useEffect, useState } from 'react';
import type { McpData } from '@shared/mcp_types';
import type { CatalogService } from '@shared/provider_types';
import { Pencil } from 'lucide-react';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { McpServerForm } from '../mcp/components/McpServerForm';

function manifestMcp(service: CatalogService): McpData {
	return {
		type: 'http',
		name: service.name,
		url: service.url ?? '',
		enabled: true,
	};
}

export function McpCard({ service }: { readonly service: CatalogService }): React.JSX.Element {
	const [server, setServer] = useState<McpData | null>(null);
	const [editing, setEditing] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void window.mcp.list().then((servers) => {
			if (!cancelled) setServer(servers[service.id] ?? null);
		});
		return () => {
			cancelled = true;
		};
	}, [service.id]);

	const save = async (id: string, entry: McpData): Promise<void> => {
		const servers = await window.mcp.list();
		await window.mcp.save({ ...servers, [id]: entry });
		setServer(entry);
		setEditing(false);
	};

	return (
		<Card
			className={cn(
				'rounded-lg border-border bg-card py-0 shadow-none',
				editing && 'border-ring ring-2 ring-ring/20'
			)}
		>
			<CardContent className="p-0">
				<div className={cn('grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5', editing && 'pb-2')}>
					<ProviderAvatar
						providerId={service.provider.id}
						name={service.provider.name}
						iconDarkUrl={service.provider.iconDarkUrl}
						iconLightUrl={service.provider.iconLightUrl}
					/>
					<div className="min-w-0">
						<h2 className="truncate text-sm font-semibold leading-tight text-foreground">
							{service.provider.name}
						</h2>
						<p className="truncate text-xs font-medium leading-tight text-muted-foreground">
							{service.name}
						</p>
					</div>
					{!editing && (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label={`Edit ${service.name}`}
							onClick={() => setEditing(true)}
						>
							<Pencil className="size-3.5" />
						</Button>
					)}
				</div>

				{editing && (
					<div className="border-t border-border px-3 py-3">
						<McpServerForm
							initial={{ id: service.id, entry: server ?? manifestMcp(service) }}
							onSubmit={save}
							onCancel={() => setEditing(false)}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
