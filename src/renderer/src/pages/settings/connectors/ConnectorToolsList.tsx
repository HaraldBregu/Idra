import React from 'react';
import { ShieldCheck, ShieldAlert, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ConnectorTool } from '../../../../../shared/connectors';
import { SettingsEmptyState } from '../components';

export function ConnectorToolsList({
	tools,
}: {
	readonly tools: readonly ConnectorTool[];
}): React.JSX.Element {
	if (tools.length === 0) {
		return (
			<Card size="sm" className="gap-0 py-0">
				<CardContent className="p-0">
					<SettingsEmptyState
						icon={Wrench}
						title="No tools selected for this connector."
						description="Refresh tools or change the connector allowlist."
						className="min-h-28"
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card size="sm" className="gap-0 py-0">
			<CardContent className="flex flex-col p-0">
				{tools.map((tool) => (
					<div
						key={tool.name}
						className="flex min-h-[44px] items-start gap-2 border-b border-border/70 px-3 py-2 last:border-b-0"
					>
						<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
							<Wrench className="size-3.5 text-muted-foreground" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-1.5">
								<h4 className="text-[13px] font-semibold">{tool.name}</h4>
								<Badge
									variant={tool.requiresApproval ? 'outline' : 'secondary'}
									className="gap-1 text-[10px]"
								>
									{tool.requiresApproval ? (
										<ShieldAlert className="size-2.5" />
									) : (
										<ShieldCheck className="size-2.5" />
									)}
									{tool.requiresApproval ? 'Approval required' : 'No approval'}
								</Badge>
							</div>
							{tool.description && (
								<p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
									{tool.description}
								</p>
							)}
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
