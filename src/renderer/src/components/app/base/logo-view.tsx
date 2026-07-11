import React from 'react';

export function LogoView(): React.JSX.Element {
	return (
		<div className="flex flex-col items-center gap-4">
			<div
				className="relative flex size-[260px] items-center justify-center"
				role="img"
				aria-label="Magenta and orange planet with a glowing ring"
			>
				<div className="absolute left-2 top-[118px] h-8 w-[244px] rounded-[50%] border-2 border-fuchsia-500 shadow-[0_0_10px_#ec4899]" />
				<div className="absolute left-2 top-[118px] h-8 w-[244px] rounded-[50%] border-2 border-orange-400 shadow-[0_0_10px_#fb923c] [clip-path:inset(0_0_0_50%)]" />
				<div className="relative z-10 size-[210px] rounded-full bg-[radial-gradient(circle_at_68%_32%,#ffb15c_0%,#ff654f_24%,#d51f70_52%,#55116e_78%,#160a35_100%)] shadow-[inset_-20px_-24px_35px_rgba(14,4,38,0.55),0_0_28px_rgba(225,39,116,0.32)]" />
				<div className="absolute left-2 top-[118px] z-20 h-8 w-[244px] rounded-[50%] border-2 border-fuchsia-400 shadow-[0_0_10px_#f472b6] [clip-path:inset(50%_0_0_0)]" />
				<div className="absolute left-2 top-[118px] z-20 h-8 w-[244px] rounded-[50%] border-2 border-orange-300 shadow-[0_0_10px_#fdba74] [clip-path:inset(50%_0_0_50%)]" />
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
