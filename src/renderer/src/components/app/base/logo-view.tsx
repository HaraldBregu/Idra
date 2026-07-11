import React from 'react';

const ORBIT_STYLE: React.CSSProperties = {
	background: 'linear-gradient(90deg, #ec4899 0%, #f43f5e 42%, #fb7185 58%, #fb923c 100%)',
	mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
	maskComposite: 'exclude',
	WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
	WebkitMaskComposite: 'xor',
};

export function LogoView(): React.JSX.Element {
	return (
		<div>
			<div
				className="relative flex size-[260px] items-center justify-center"
				role="img"
				aria-label="Magenta and orange planet with a glowing ring"
			>
				<div
					className="absolute -left-10 top-[108px] h-11 w-[340px] rounded-[50%] p-0.5 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]"
					style={ORBIT_STYLE}
				/>
				<div className="relative z-10 size-[210px] rounded-full bg-[radial-gradient(circle_at_68%_32%,#ffbd74_0%,#ff9a63_14%,#ff6a55_30%,#ed3b66_45%,#cc2477_58%,#8b1d7b_72%,#4c176a_86%,#180a35_100%)] shadow-[inset_-20px_-24px_35px_rgba(14,4,38,0.48),0_0_28px_rgba(225,39,116,0.28)]" />
				<div
					className="absolute -left-10 top-[108px] z-20 h-11 w-[340px] rounded-[50%] p-0.5 drop-shadow-[0_0_8px_rgba(251,113,133,0.85)] [clip-path:inset(50%_0_0_0)]"
					style={ORBIT_STYLE}
				/>
			</div>
		</div>
	);
}
