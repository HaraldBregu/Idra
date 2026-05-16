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
			<Card size="sm" className="gap-0 rounded-lg py-0 shadow-none">
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
		<Card size="sm" className="gap-0 rounded-lg py-0 shadow-none">
			<CardContent className="flex flex-col p-0">
				{tools.map((tool) => (
					<div
						key={tool.name}
						className="flex min-h-9 items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0"
					>
						<Wrench className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-1.5">
								<h4 className="text-xs font-medium leading-4">{tool.name}</h4>
								<Badge
									variant={tool.requiresApproval ? 'outline' : 'secondary'}
									className="h-4 gap-1 px-1.5 text-[10px]"
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
								<p className="text-[11px] leading-4 text-muted-foreground">
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
