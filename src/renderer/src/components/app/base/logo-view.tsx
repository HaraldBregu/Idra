import React from 'react';
import { AppIconFriday } from '@/components/app/icons/AppIconFriday';

export function LogoView(): React.JSX.Element {
	return (
		<div className="flex flex-col items-center gap-4">
			<div
				className="relative flex size-[260px] items-center justify-center"
				role="img"
				aria-label="Friday logo orb"
			>
				<div className="absolute inset-5 animate-pulse rounded-full bg-primary/20 blur-2xl" />
				<div className="absolute inset-0 rounded-full border border-primary/25 [animation:spin_18s_linear_infinite]" />
				<div className="absolute inset-5 rounded-full border border-primary/35 [transform:rotateX(68deg)_rotateZ(35deg)]" />
				<div className="absolute inset-10 rounded-full border border-primary/20 [transform:rotateX(62deg)_rotateZ(-42deg)]" />
				<div className="relative flex size-44 items-center justify-center rounded-full border border-primary/30 bg-gradient-to-br from-primary/30 via-background to-primary/10 shadow-[0_0_60px_hsl(var(--primary)/0.25)]">
					<AppIconFriday className="size-24 text-primary" />
				</div>
			</div>
			<div className="flex h-[22px] items-center gap-2">
				<div className="size-2 animate-pulse rounded-full bg-primary" />
				<span className="text-sm italic text-primary">Friday</span>
			</div>
			<p className="min-h-[72px] max-w-72 text-center text-sm leading-relaxed text-muted-foreground">
				Your personal AI assistant.
			</p>
			<div className="h-[22px] w-[150px]" />
		</div>
	);
}
