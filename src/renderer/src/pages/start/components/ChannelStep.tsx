import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CHANNEL_CATALOG } from '@shared';
import type { Channel, ChannelType } from '@shared';
import { ChannelIcon } from '../../settings/pages/channels/ChannelIcon';
import { STEP_COPY } from '../constants';
import { StepHeader } from './StepHeader';

export function ChannelStep(): React.JSX.Element {
	const { title, description } = STEP_COPY.channels;
	const [config, setConfig] = useState<Channel | null>(null);

	useEffect(() => {
		let cancelled = false;
		void window.channels.getConfig().then(
			(loaded) => {
				if (!cancelled) setConfig(loaded);
			},
			(error) => console.error('[ChannelStep] Failed to load channel settings:', error)
		);
		return () => {
			cancelled = true;
		};
	}, []);

	function updateToken(channelId: ChannelType, token: string): void {
		setConfig((current) =>
			current ? { ...current, [channelId]: { ...current[channelId], token } } : current
		);
	}

	async function saveToken(channelId: ChannelType): Promise<void> {
		if (!config) return;
		const token = config[channelId].token.trim();
		try {
			const saved = await window.channels.saveChannelConfig(channelId, {
				...config[channelId],
				token,
				enabled: token.length > 0,
			});
			setConfig((current) => (current ? { ...current, [channelId]: saved } : current));
		} catch (error) {
			console.error('[ChannelStep] Failed to save channel settings:', error);
		}
	}

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
			<StepHeader title={title} description={description} />

			<div className="mt-6 space-y-2">
				{CHANNEL_CATALOG.map((entry) => (
					<Card key={entry.id} className="rounded-lg border-border bg-card py-0 shadow-none">
						<CardContent className="grid gap-2 p-3">
							<div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2.5">
								<ChannelIcon channelId={entry.id} name={entry.label} brandIconId={entry.brandIconId} />
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold leading-tight text-foreground">
										{entry.label}
									</p>
									<p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">
										{entry.blurb}
									</p>
								</div>
							</div>
							<Input
								aria-label={`${entry.label} bot token`}
								autoComplete="off"
								className="h-8 rounded-md border-input bg-card px-2.5 text-xs font-mono placeholder:font-sans placeholder:text-muted-foreground"
								disabled={!config}
								onBlur={() => void saveToken(entry.id)}
								onChange={(event) => updateToken(entry.id, event.target.value)}
								placeholder="Paste your bot token"
								spellCheck={false}
								type="password"
								value={config?.[entry.id].token ?? ''}
							/>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
