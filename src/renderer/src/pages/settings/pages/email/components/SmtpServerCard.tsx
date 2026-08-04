import React, { useState } from 'react';
import { Pencil, Server } from 'lucide-react';
import type { SmtpProviderInput, SmtpProviderSummary } from '@shared/email_types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SmtpServerForm } from './SmtpServerForm';

export function SmtpServerCard({
	active,
	provider,
	onActivate,
	onSave,
}: {
	readonly active: boolean;
	readonly provider: SmtpProviderSummary;
	readonly onActivate: () => Promise<void>;
	readonly onSave: (input: SmtpProviderInput) => Promise<void>;
}): React.JSX.Element {
	const [expanded, setExpanded] = useState(false);
	const [editing, setEditing] = useState(false);

	return (
		<Card size="sm">
			<Collapsible open={expanded} onOpenChange={setExpanded}>
				<CardHeader className={cn('items-center', expanded && 'border-b')}>
					<div className="flex min-w-0 flex-1 items-center gap-2.5">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
							<Server className="size-4 text-muted-foreground" />
						</div>
						<div className="min-w-0">
							<CardTitle className="truncate">{provider.name}</CardTitle>
							<p className="truncate font-mono text-xs text-muted-foreground">{provider.host}:{provider.port}</p>
						</div>
					</div>
					<CardAction className="flex items-center gap-1">
						{active ? <Badge variant="secondary">Active</Badge> : <Button variant="outline" size="sm" onClick={() => void onActivate()}>Use</Button>}
						<Button variant="ghost" size="icon-sm" aria-label={`Edit ${provider.name}`} onClick={() => { setExpanded(true); setEditing(true); }}>
							<Pencil className="size-3" />
						</Button>
					</CardAction>
				</CardHeader>
				<CollapsibleContent>
					<CardContent className="pt-4">
						{editing ? (
							<SmtpServerForm initial={provider} onSubmit={async (input) => { await onSave(input); setEditing(false); setExpanded(false); }} onCancel={() => { setEditing(false); setExpanded(false); }} />
						) : (
							<p className="text-sm text-muted-foreground">Sender: {provider.from}</p>
						)}
					</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}
