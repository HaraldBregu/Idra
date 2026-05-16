import type { ReactElement } from 'react';
import { VoiceOrbThree } from '@/components/app/base/voice-orb-three';
import { Button } from '@/components/ui/button';
import { MessageContent } from '@/components/ui/message';

export function HomeVoiceSurface({
	onSwitchToTyping,
}: {
	readonly onSwitchToTyping: () => void;
}): ReactElement {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
			<div className="flex flex-1 flex-col items-center justify-center px-8 py-8">
				<p className="mb-10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
					Voice Chat
				</p>
				<VoiceOrbThree />
			</div>
			<div className="border-t border-border px-6 py-4">
				<MessageContent className="flex min-h-10 items-center justify-between gap-4 rounded-full px-5 py-0 text-xs font-semibold text-muted-foreground">
					<div className="flex items-center gap-3">
						<span className="size-3 rounded-full bg-muted-foreground" aria-hidden />
						<span>Voice mode</span>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onSwitchToTyping}
						className="rounded-full"
					>
						<span>switch to typing</span>
						<span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
							⌘ /
						</span>
					</Button>
				</MessageContent>
			</div>
		</div>
	);
}
