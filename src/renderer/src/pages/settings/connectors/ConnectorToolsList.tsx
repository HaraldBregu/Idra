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
		<Card size="sm" className="gap-0 rounded-xl py-0 shadow-none">
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
		<Card size="sm" className="gap-0 rounded-xl py-0 shadow-none">
			<CardContent className="flex flex-col p-0">
				{tools.map((tool) => (
					<div
						key={tool.name}
						className="flex min-h-[44px] items-center gap-2.5 border-b border-border/60 px-4 py-2.5 last:border-b-0"
					>
						<Wrench className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<h4 className="text-[13px] font-medium leading-5">{tool.name}</h4>
								<Badge
									variant={tool.requiresApproval ? 'outline' : 'secondary'}
									className="h-5 gap-1 text-xs"
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
								<p className="text-xs leading-4 text-muted-foreground">
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
