import React, { useState } from 'react';
import { CheckCircle2, Loader2, PlugZap } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tool = Awaited<ReturnType<typeof window.connectors.listTools>>['tools'][number];

export function ConnectorTools({ id }: { readonly id: string }): React.JSX.Element {
	const [tools, setTools] = useState<Tool[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [testing, setTesting] = useState(false);

	const test = async (): Promise<void> => {
		setTesting(true);
		setError(null);
		try {
			const result = await window.connectors.listTools(id);
			setTools(result.tools);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
			setTools(null);
		} finally {
			setTesting(false);
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" disabled={testing} onClick={test}>
					{testing ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<PlugZap className="size-3.5" />
					)}
					{testing ? 'Testing' : 'Test connection'}
				</Button>
				{tools && !error && (
					<span className="flex items-center gap-1 text-[12px] text-muted-foreground">
						<CheckCircle2 className="size-3.5 text-emerald-500" />
						{tools.length} {tools.length === 1 ? 'tool' : 'tools'}
					</span>
				)}
			</div>

			{error && <p className="text-[12px] text-destructive">{error}</p>}

			{tools && tools.length > 0 && (
				<ul className="flex flex-col gap-1">
					{tools.map((tool) => (
						<li key={tool.name} className="rounded-md border border-border/70 bg-card px-2.5 py-1.5">
							<div className="font-mono text-[12px]">{tool.name}</div>
							{tool.description && (
								<div className="line-clamp-2 text-[12px] text-muted-foreground">
									{tool.description}
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
